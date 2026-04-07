import { readFileSync } from "node:fs";
import { parseFile } from "./src/utils/parser.ts";
import { TestFileSchema } from "./src/types/index.ts";

const filePath = "/Users/mariosant/Projects/llens/example/test.llens.yml";

console.log(`Reading file: ${filePath}`);

try {
  const content = readFileSync(filePath, "utf-8");
  console.log("File content:\n", content);

  console.log("\nParsing file...");
  const parsed = parseFile(content, filePath);
  console.log("Parsed result:", JSON.stringify(parsed, null, 2));

  console.log("\nValidating with TestFileSchema...");
  const validated = TestFileSchema.parse(parsed);
  console.log("Validation successful:", validated);
} catch (error) {
  console.error("\n=== ERROR ===");
  console.error("Error:", error);
  console.error("\n=== STACK TRACE ===");
  console.error(error instanceof Error ? error.stack : new Error(String(error)).stack);
  
  // Additional Zod-specific info
  if (error instanceof Error && "issues" in error) {
    console.error("\n=== ZOD ISSUES ===");
    console.error((error as any).issues);
  }
}
