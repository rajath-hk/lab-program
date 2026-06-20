import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// --- Types ---

interface ExcelTestCase {
  input: string;
  output: string;
  isHidden?: boolean;
}

interface ExcelHintRule {
  regexPattern: string;
  hintMessage: string;
}

interface ExcelProblemRow {
  Title: string;
  Description: string;
  BoilerplateCode: string;
  TestCases: string; // JSON string
  Hints: string; // JSON string
}

interface BulkUploadResult {
  successCount: number;
  errors: { row: number; message: string }[];
}

/**
 * Parses a JSON string field from the Excel, returning the parsed array.
 * If parsing fails, returns null and pushes an error descriptor.
 */
function parseJsonField<T>(
  raw: unknown,
  fieldName: string,
  rowNumber: number,
  errors: { row: number; message: string }[]
): T[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors.push({
      row: rowNumber,
      message: `'${fieldName}' is missing or empty`,
    });
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      errors.push({
        row: rowNumber,
        message: `'${fieldName}' must be a JSON array`,
      });
      return null;
    }

    return parsed as T[];
  } catch (parseError) {
    errors.push({
      row: rowNumber,
      message: `'${fieldName}' contains invalid JSON: ${
        parseError instanceof Error ? parseError.message : 'Parse error'
      }`,
    });
    return null;
  }
}

/**
 * POST /api/teacher/problems/bulk
 *
 * Uploads an Excel/CSV file containing problems and atomically inserts
 * them along with their nested TestCases and HintRules into the database.
 *
 * Expects multipart/form-data with a single 'file' field.
 * Requires verifyToken + requireTeacher middleware (handled at route level).
 *
 * Excel columns:
 *   Title (String)
 *   Description (Markdown String)
 *   BoilerplateCode (String)
 *   TestCases (JSON string, e.g., [{"input": "1 2", "output": "3", "isHidden": true}])
 *   Hints (JSON string, e.g., [{"regexPattern": "NullPointer", "hintMessage": "Check for null"}])
 */
export const bulkUploadProblems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // --- Verify file exists ---

    if (!req.file) {
      res.status(400).json({ error: 'Validation Error: No file uploaded. Please attach a .xlsx or .csv file.' });
      return;
    }

    const teacherId = req.user!.id;

    // --- Parse workbook from buffer ---

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      res.status(400).json({
        error: 'Parse Error: Unable to read the uploaded file. Ensure it is a valid .xlsx or .csv format.',
      });
      return;
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: 'Validation Error: The uploaded file contains no sheets.' });
      return;
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to array of objects using header row
    const rows: ExcelProblemRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      res.status(400).json({ error: 'Validation Error: The uploaded file contains no data rows.' });
      return;
    }

    // --- Validate required headers ---

    const expectedHeaders = ['Title', 'Description', 'BoilerplateCode', 'TestCases', 'Hints'];
    const actualHeaders = Object.keys(rows[0] ?? {});

    for (const header of expectedHeaders) {
      if (!actualHeaders.includes(header)) {
        res.status(400).json({
          error: `Validation Error: Missing required column "${header}". Expected headers: ${expectedHeaders.join(', ')}`,
        });
        return;
      }
    }

    // --- Process rows and collect results ---

    const result: BulkUploadResult = { successCount: 0, errors: [] };

    // Use $transaction for atomic batch insert
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // 1-indexed + header row

        // Validate required fields
        if (!row.Title || String(row.Title).trim() === '') {
          result.errors.push({
            row: rowNumber,
            message: "'Title' is required and must be a non-empty string",
          });
          continue;
        }

        if (!row.Description || String(row.Description).trim() === '') {
          result.errors.push({
            row: rowNumber,
            message: "'Description' is required and must be a non-empty string",
          });
          continue;
        }

        // Parse TestCases JSON
        const testCases = parseJsonField<ExcelTestCase>(
          row.TestCases,
          'TestCases',
          rowNumber,
          result.errors
        );
        if (testCases === null) continue;

        // Validate TestCase structure
        let testCasesValid = true;
        for (let tcIdx = 0; tcIdx < testCases.length; tcIdx++) {
          const tc = testCases[tcIdx];
          if (!tc.input || !tc.output) {
            result.errors.push({
              row: rowNumber,
              message: `TestCases[${tcIdx}] is missing required field 'input' or 'output'`,
            });
            testCasesValid = false;
            break;
          }
        }
        if (!testCasesValid) continue;

        // Parse Hints JSON
        const hints = parseJsonField<ExcelHintRule>(
          row.Hints,
          'Hints',
          rowNumber,
          result.errors
        );
        if (hints === null) continue;

        // Validate HintRule structure
        let hintsValid = true;
        for (let hintIdx = 0; hintIdx < hints.length; hintIdx++) {
          const hint = hints[hintIdx];
          if (!hint.regexPattern || !hint.hintMessage) {
            result.errors.push({
              row: rowNumber,
              message: `Hints[${hintIdx}] is missing required field 'regexPattern' or 'hintMessage'`,
            });
            hintsValid = false;
            break;
          }
        }
        if (!hintsValid) continue;

        // Create the Problem with nested TestCases and HintRules
        try {
          await tx.problem.create({
            data: {
              title: String(row.Title).trim(),
              description: String(row.Description).trim(),
              boilerplateCode: String(row.BoilerplateCode ?? '').trim(),
              teacher: { connect: { id: teacherId } },
              testCases: {
                create: testCases.map((tc) => ({
                  input: String(tc.input),
                  expectedOutput: String(tc.output),
                  isHidden: tc.isHidden ?? true,
                })),
              },
              hintRules: {
                create: hints.map((hint) => ({
                  regexPattern: hint.regexPattern,
                  hintMessage: hint.hintMessage,
                })),
              },
            },
          });

          result.successCount++;
        } catch (createError) {
          result.errors.push({
            row: rowNumber,
            message: `Database error: ${
              createError instanceof Error ? createError.message : 'Unknown error'
            }`,
          });
        }
      }
    });

    res.status(201).json({
      message: `Upload complete: ${result.successCount} problem(s) created successfully`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/problems
 *
 * Fetches all problems created by the authenticated teacher.
 * Includes counts of test cases and hints for each problem.
 * Requires verifyToken + requireTeacher middleware.
 */
export const getTeacherProblems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const problems = await prisma.problem.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: {
            testCases: true,
            hintRules: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProblems = problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      boilerplateCode: problem.boilerplateCode,
      testCaseCount: problem._count.testCases,
      hintCount: problem._count.hintRules,
      submissionCount: problem._count.submissions,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    }));

    res.status(200).json({ problems: formattedProblems });
  } catch (error) {
    next(error);
  }
};
