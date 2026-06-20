// --- Types ---

export interface HintRuleData {
  regexPattern: string;
  hintMessage: string;
}

export interface HintResult {
  matched: boolean;
  hintMessage: string | null;
}

/**
 * Evaluates error output against a set of hint rules.
 *
 * Iterates through the problemHints array, tests each regex pattern
 * against the provided errorOutput (which could be stderr or compileOutput
 * from Judge0). If a match is found, immediately returns the hintMessage.
 * If no match is found, returns null.
 *
 * @param errorOutput - The error text from Judge0 (stderr or compile_output)
 * @param problemHints - Array of HintRule objects from the database
 * @returns The first matching hint message, or null if no match
 */
export function evaluateHints(
  errorOutput: string | null | undefined,
  problemHints: HintRuleData[]
): HintResult {
  // If there's no error output, no hints can be matched
  if (!errorOutput || errorOutput.trim() === '') {
    return { matched: false, hintMessage: null };
  }

  const normalizedError = errorOutput.trim();

  for (const hint of problemHints) {
    try {
      // Create a case-insensitive regex from the pattern
      const regex = new RegExp(hint.regexPattern, 'i');

      if (regex.test(normalizedError)) {
        return {
          matched: true,
          hintMessage: hint.hintMessage,
        };
      }
    } catch (regexError) {
      // If a regex pattern is invalid, skip it gracefully
      console.error(
        `[HintEngine] Invalid regex pattern: "${hint.regexPattern}"`,
        regexError
      );
      continue;
    }
  }

  return { matched: false, hintMessage: null };
}
