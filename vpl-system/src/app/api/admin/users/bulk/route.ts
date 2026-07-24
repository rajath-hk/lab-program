import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateRandomPassword } from "@/lib/utils"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"
import * as XLSX from "xlsx"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const defaultDepartmentId = formData.get("departmentId") as string | null
    const defaultSemester = formData.get("semester")
      ? parseInt(formData.get("semester") as string, 10)
      : null

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls")
    const isCsv = fileName.endsWith(".csv")

    if (!isExcel && !isCsv) {
      return NextResponse.json(
        { error: "Only .xlsx, .xls, and .csv files are accepted" },
        { status: 400 }
      )
    }

    // Read the file
    const buffer = Buffer.from(await file.arrayBuffer())
    let rows: Record<string, unknown>[]

    if (isCsv) {
      // Parse CSV
      const workbook = XLSX.read(buffer, { type: "buffer", raw: true })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return NextResponse.json({ error: "CSV file is empty" }, { status: 400 })
      }
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[]
    } else {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return NextResponse.json({ error: "Excel file is empty" }, { status: 400 })
      }
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[]
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File has no data rows" },
        { status: 400 }
      )
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 students per import" },
        { status: 400 }
      )
    }

    // Normalize column names (case-insensitive, trim, remove special chars)
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key
          .toLowerCase()
          .trim()
          .replace(/[\s_-]+/g, "")
          .replace(/[^a-z0-9]/g, "")
        normalized[cleanKey] = value
      }
      return normalized
    })

    // Detect columns by trying common names
    function findColumn(
      row: Record<string, unknown>,
      names: string[]
    ): string | undefined {
      for (const name of names) {
        const cleanName = name.toLowerCase().replace(/[\s_-]+/g, "").replace(/[^a-z0-9]/g, "")
        if (row[cleanName] !== undefined) return cleanName
      }
      return undefined
    }

    // Fetch all departments for code-based lookup
    const departments = await prisma.department.findMany({
      select: { id: true, code: true },
    })
    const deptByCode = new Map(departments.map((d) => [d.code.toLowerCase(), d]))
    const deptById = new Map(departments.map((d) => [d.id, d]))

    // Validate and prepare data
    const errors: { row: number; error: string }[] = []
    const validStudents: {
      rollNumber: string
      name: string
      email: string
      password: string
      departmentId: string
      semester: number
    }[] = []

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i]
      const rowNum = i + 2 // 1-indexed + header row

      // Find roll number column
      const rollCol = findColumn(row, [
        "rollnumber", "roll number", "roll_no", "rollno",
        "studentid", "student_id", "id", "enrollment",
      ])
      const rollNumber = rollCol ? String(row[rollCol] || "").trim() : ""

      if (!rollNumber) {
        errors.push({ row: rowNum, error: "Roll number is required (column: RollNumber)" })
        continue
      }

      // Find name column
      const nameCol = findColumn(row, [
        "name", "studentname", "student_name", "fullname", "full_name",
      ])
      const name = nameCol ? String(row[nameCol] || "").trim() : ""

      // Find email column (optional)
      const emailCol = findColumn(row, [
        "email", "e_mail", "mail", "emailaddress", "email_address",
      ])
      const email = emailCol ? String(row[emailCol] || "").trim() : ""

      // Find department column
      const deptCol = findColumn(row, [
        "department", "departmentcode", "department_code", "dept", "deptcode",
        "dept_code", "departmentname", "department_name",
      ])
      let departmentId = defaultDepartmentId || ""
      if (deptCol) {
        const deptValue = String(row[deptCol] || "").trim()
        if (deptValue) {
          const dept = deptByCode.get(deptValue.toLowerCase())
          if (dept) {
            departmentId = dept.id
          } else {
            errors.push({
              row: rowNum,
              error: `Department "${deptValue}" not found. Available codes: ${departments.map((d) => d.code).join(", ")}`,
            })
            continue
          }
        }
      }

      if (!departmentId) {
        errors.push({
          row: rowNum,
          error: "Department is required. Provide a DepartmentCode column or select a default department.",
        })
        continue
      }

      // Find semester column or use default
      const semCol = findColumn(row, [
        "semester", "sem", "year", "studyyear", "study_year",
      ])
      let semester = defaultSemester || 1
      if (semCol) {
        const parsed = parseInt(String(row[semCol]), 10)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 8) {
          semester = parsed
        } else {
          errors.push({
            row: rowNum,
            error: `Invalid semester "${row[semCol]}". Must be between 1 and 8.`,
          })
          continue
        }
      }

      // Generate password
      const password = generateRandomPassword()

      validStudents.push({
        rollNumber,
        name: name || "New Student",
        email: email || `student-${rollNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@temp.amc.edu`,
        password,
        departmentId,
        semester,
      })
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validStudents.length,
          errorCount: errors.length,
        },
        { status: 400 }
      )
    }

    // Pre-hash all passwords in parallel before the transaction
    const studentsWithHashes = await Promise.all(
      validStudents.map(async (s) => ({
        ...s,
        hashedPassword: await bcrypt.hash(s.password, 10),
      }))
    )

    // Create all students in a transaction
    const createdStudents = await prisma.$transaction(async (tx) => {
      const results: Array<{
        rollNumber: string
        name: string
        email: string
        generatedPassword: string
        success: boolean
        error?: string
      }> = []

      for (const s of studentsWithHashes) {
        try {
          await tx.user.create({
            data: {
              name: s.name,
              email: s.email,
              password: s.hashedPassword,
              role: "STUDENT",
              isOnboarded: false,
              student: {
                create: {
                  rollNumber: s.rollNumber,
                  departmentId: s.departmentId,
                  semester: s.semester,
                },
              },
            },
          })

          results.push({
            rollNumber: s.rollNumber,
            name: s.name,
            email: s.email,
            generatedPassword: s.password,
            success: true,
          })
        } catch (err: any) {
          const isDuplicate = err?.code === "P2002"
          results.push({
            rollNumber: s.rollNumber,
            name: s.name,
            email: s.email,
            generatedPassword: s.password,
            success: false,
            error: isDuplicate
              ? `Duplicate: a user with this ${err.meta?.target?.[0] || "field"} already exists`
              : err.message || "Failed to create student",
          })
        }
      }

      return results
    })

    const successCount = createdStudents.filter((s) => s.success).length
    const failCount = createdStudents.filter((s) => !s.success).length

    await logActivity(
      session.user.id,
      "BULK_IMPORT_STUDENTS",
      `Bulk imported ${successCount} students from "${file.name}"` +
        (failCount > 0 ? ` (${failCount} failed)` : "")
    )

    return NextResponse.json({
      success: true,
      total: createdStudents.length,
      successCount,
      failCount,
      students: createdStudents,
    })
  } catch (error) {
    console.error("Failed to bulk import students:", error)
    return NextResponse.json(
      { error: "Failed to process bulk import. Please check the file format." },
      { status: 500 }
    )
  }
}
