import { defineCommand } from "citty";
import { glob } from "../utils/glob";
import { parseFile } from "../utils/parser";
import { loadConfig } from "../core/config";
import { runTestFile } from "../core/runner";
import { TestFileSchema } from "../types";
import { ok, err, type Result } from "../utils/result";
import type { RuntimeConfig, TestFile, TestStats } from "../types";

interface RunArgs {
  readonly files?: string;
  readonly model?: string;
  readonly timeout?: string;
  readonly reporter?: string;
  readonly "fail-fast"?: boolean;
}

const parseCliOverrides = (args: RunArgs): Partial<RuntimeConfig> => {
  const overrides: Partial<RuntimeConfig> = {};

  if (args.model) Object.assign(overrides, { model: args.model });
  if (args.timeout)
    Object.assign(overrides, { timeout: parseInt(args.timeout, 10) });
  if (args["fail-fast"]) Object.assign(overrides, { failFast: true });

  return overrides;
};

const DEFAULT_PATTERN = "**/*.llens.{yml,yaml,json,toml,json5}";

const resolvePattern = (files?: string): string => files ?? DEFAULT_PATTERN;

const loadTestFile = async (
  filePath: string,
): Promise<Result<TestFile, string>> => {
  const content = await Bun.file(filePath).text();
  const parseResult = parseFile(content, filePath);

  if (parseResult.kind === "err") {
    return err(parseResult.error.message);
  }

  const validationResult = TestFileSchema.safeParse(parseResult.value);

  return validationResult.success
    ? ok(validationResult.data)
    : err(
        validationResult.error.issues
          .map((e: { message: string }) => e.message)
          .join(", "),
      );
};

const aggregateStats = (statsArray: readonly TestStats[]): TestStats =>
  statsArray.reduce(
    (acc, stats) => ({
      total: acc.total + stats.total,
      passed: acc.passed + stats.passed,
      failed: acc.failed + stats.failed,
      duration: acc.duration + stats.duration,
    }),
    { total: 0, passed: 0, failed: 0, duration: 0 },
  );

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
    reporter: {
      type: "string",
      description: "Mocha reporter to use",
      default: "spec",
    },
    "fail-fast": {
      type: "boolean",
      description: "Stop running tests on first failure",
      alias: "bail",
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const cliOverrides = parseCliOverrides(args);

    const configResult = await loadConfig(cwd, cliOverrides);

    if (configResult.kind === "err") {
      console.error(`Error: ${configResult.error.message}`);
      process.exit(1);
    }

    const config = configResult.value;

    if (!config.apiKey) {
      console.error(
        "Error: No API key provided. Set LLENS_API_KEY environment variable or add apiKey to config.",
      );
      process.exit(1);
    }

    const pattern = resolvePattern(args.files);
    const testFiles = await glob(pattern);

    if (testFiles.length === 0) {
      console.error("No test files found.");
      process.exit(1);
    }

    const mochaOptions = {
      reporter: args.reporter || "spec",
    };

    const allStats: TestStats[] = [];

    for (const filePath of testFiles) {
      const testFileResult = await loadTestFile(filePath);

      if (testFileResult.kind === "err") {
        console.error(`Error loading ${filePath}: ${testFileResult.error}`);
        process.exit(1);
      }

      const stats = await runTestFile(
        config,
        testFileResult.value,
        filePath,
        mochaOptions,
      );
      allStats.push(stats);
    }

    const totalStats = aggregateStats(allStats);

    process.exit(totalStats.failed > 0 ? 1 : 0);
  },
});
