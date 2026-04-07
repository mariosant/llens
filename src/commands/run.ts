import { defineCommand } from "citty";
import { glob } from "../utils/glob";
import { parseFile } from "../utils/parser";
import { loadConfig } from "../core/config";
import { TestRunner } from "../core/runner";
import { PlainFormatter } from "../formatters/plain";
import { TestFileSchema } from "../types";
import path from "path";

export default defineCommand({
  meta: {
    name: "run",
    description: "Run LLM quality tests",
  },
  args: {
    files: {
      type: "positional",
      description: "Test files to run (supports glob patterns)",
      required: false,
    },
    model: {
      type: "string",
      description: "Model to use",
    },
    timeout: {
      type: "string",
      description: "Request timeout in ms",
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const cliOverrides: Record<string, string | number> = {};
    
    if (args.model) cliOverrides.model = args.model;
    if (args.timeout) cliOverrides.timeout = parseInt(args.timeout, 10);
    
    const config = await loadConfig(cwd, cliOverrides as any);
    
    if (!config.apiKey) {
      console.error("Error: No API key provided. Set LLENS_API_KEY environment variable or add apiKey to config.");
      process.exit(1);
    }
    
    // Find test files
    const testFiles = args.files 
      ? await glob(args.files)
      : await glob("**/*.llens.{yml,yaml,json,toml,json5}");
    
    if (testFiles.length === 0) {
      console.error("No test files found.");
      process.exit(1);
    }
    
    const formatter = new PlainFormatter();
    const runner = new TestRunner(config, formatter);
    
    formatter.start();
    
    let totalStats = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
    };
    
    for (const filePath of testFiles) {
      try {
        const content = await Bun.file(filePath).text();
        const parsed = parseFile(content, filePath);
        const testFile = TestFileSchema.parse(parsed);
        const stats = await runner.runTestFile(testFile, filePath);
        
        totalStats.total += stats.total;
        totalStats.passed += stats.passed;
        totalStats.failed += stats.failed;
        totalStats.duration += stats.duration;
      } catch (error) {
        console.error(`Error running ${filePath}:`, error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }
    
    formatter.summary(totalStats);
    formatter.end();
    
    process.exit(totalStats.failed > 0 ? 1 : 0);
  },
});
