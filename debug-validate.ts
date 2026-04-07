import { readFileSync } from "node:fs";
import { parseFile } from "./src/utils/parser";
import { TestFileSchema } from "./src/types/index";
import { isOk, isErr } from "./src/utils/result";

const filePath = "/Users/mariosant/Projects/llens/example/test.llens.yml";

console.log(`Reading file: ${filePath}`);

// Read file
const readResult = (() => {
  try {
    return { kind: "ok" as const, value: readFileSync(filePath, "utf-8") };
  } catch (error) {
    return { 
      kind: "err" as const, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
})();

if (readResult.kind === "err") {
  console.error("\n=== READ ERROR ===");
  console.error("Error:", readResult.error);
  console.error("\n=== STACK TRACE ===");
  console.error(readResult.error.stack);
  process.exit(1);
}

const content = readResult.value;
console.log("File content:\n", content);

console.log("\nParsing file...");
const parseResult = parseFile(content, filePath);

if (isErr(parseResult)) {
  console.error("\n=== PARSE ERROR ===");
  console.error("Error:", parseResult.error);
  process.exit(1);
}

console.log("Parsed result:", JSON.stringify(parseResult.value, null, 2));

console.log("\nValidating with TestFileSchema...");
const validationResult = TestFileSchema.safeParse(parseResult.value);

if (!validationResult.success) {
  console.error("\n=== VALIDATION ERROR ===");
  console.error("Zod Issues:", validationResult.error.errors);
  process.exit(1);
}

console.log("Validation successful:", validationResult.data);
