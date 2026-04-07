import { defineCommand } from "citty";
import { glob } from "../utils/glob";
import { parseFile } from "../utils/parser";
import { TestFileSchema } from "../types";

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
    const testFiles = args.files 
      ? await glob(args.files)
      : await glob("**/*.llens.{yml,yaml,json,toml,json5}");
    
    if (testFiles.length === 0) {
      console.error("No test files found.");
      process.exit(1);
    }
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const filePath of testFiles) {
      try {
        const content = await Bun.file(filePath).text();
        const parsed = parseFile(content, filePath);
        TestFileSchema.parse(parsed);
        console.log(`✓ ${filePath}`);
        validCount++;
      } catch (error) {
        console.error(`✗ ${filePath}`);
        console.error(`  ${error instanceof Error ? error.message : String(error)}`);
        invalidCount++;
      }
    }
    
    console.log();
    console.log(`${validCount} valid, ${invalidCount} invalid`);
    
    process.exit(invalidCount > 0 ? 1 : 0);
  },
});
