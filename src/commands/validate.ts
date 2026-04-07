import { defineCommand } from "citty";
import { glob } from "../utils/glob";
import { parseFile } from "../utils/parser";
import { TestFileSchema } from "../types";
import { ok, err, type Result } from "../utils/result";
import { reduceArray } from "../utils/functional";

// Validation result type
interface ValidationResult {
  readonly filePath: string;
  readonly valid: boolean;
  readonly message?: string;
}

// Default glob pattern
const DEFAULT_PATTERN = "**/*.llens.{yml,yaml,json,toml,json5}";

// Resolve glob pattern
const resolvePattern = (files?: string): string =>
  files ?? DEFAULT_PATTERN;

// Validate a single file
const validateFile = async (filePath: string): Promise<ValidationResult> => {
  const content = await Bun.file(filePath).text();
  const parseResult = parseFile(content, filePath);
  
  if (parseResult.kind === "err") {
    return { filePath, valid: false, message: parseResult.error.message };
  }
  
  const validationResult = TestFileSchema.safeParse(parseResult.value);
  
  return validationResult.success
    ? { filePath, valid: true }
    : { 
        filePath, 
        valid: false, 
        message: validationResult.error.issues.map((e: { message: string }) => e.message).join(", ") 
      };
};

// Aggregate validation results
const aggregateResults = (results: readonly ValidationResult[]) =>
  results.reduce(
    (acc, result) => ({
      valid: acc.valid + (result.valid ? 1 : 0),
      invalid: acc.invalid + (result.valid ? 0 : 1),
    }),
    { valid: 0, invalid: 0 }
  );

// Format and print result
const printResult = (result: ValidationResult): void => {
  const symbol = result.valid ? "✓" : "✗";
  const line = `${symbol} ${result.filePath}`;
  console.log(line);
  
  if (!result.valid && result.message) {
    console.error(`  ${result.message}`);
  }
};

export default defineCommand({
  meta: {
    name: "validate",
    description: "Validate test file syntax",
  },
  args: {
    files: {
      type: "positional",
      description: "Test files to validate (supports glob patterns)",
      required: false,
    },
  },
  async run({ args }) {
    const pattern = resolvePattern(args.files);
    const testFiles = await glob(pattern);
    
    if (testFiles.length === 0) {
      console.error("No test files found.");
      process.exit(1);
    }
    
    const results = await Promise.all(testFiles.map(validateFile));
    results.forEach(printResult);
    
    const { valid, invalid } = aggregateResults(results);
    console.log();
    console.log(`${valid} valid, ${invalid} invalid`);
    
    process.exit(invalid > 0 ? 1 : 0);
  },
});
