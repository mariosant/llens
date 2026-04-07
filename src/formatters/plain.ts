import type { Formatter } from "./base";
import type { TestResult, TestStats, AssertionError } from "../types";
import pc from "picocolors";

// Format duration helper
const formatDuration = (ms: number): string =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

// Status color helper
const statusColor = (failed: number): string =>
  failed === 0 ? pc.green("PASS") : pc.red("FAIL");

// Plain formatter factory - returns pure functions
export const createPlainFormatter = (): Formatter => ({
  start: () => "\n",

  suiteStart: (name: string) => `${pc.bold(name)}\n\n`,

  testStart: () => "",

  testPass: (name: string, result: TestResult) =>
    `  ${pc.green("✓")} ${name} ${pc.gray(`(${formatDuration(result.duration)})`)}\n`,

  testFail: (name: string, result: TestResult, error: AssertionError) => {
    const lines = result.response.content.split("\n");
    const preview = lines.slice(0, 3).join("\n");

    if (!preview) {
      return (
        `  ${pc.red("✗")} ${name} ${pc.gray(`(${formatDuration(result.duration)})`)}\n` +
        `    ${pc.red(error.message)}\n`
      );
    }

    const responseOutput = preview
      .split("\n")
      .map((line) => `    > ${line}`)
      .join("\n");

    return (
      `  ${pc.red("✗")} ${name} ${pc.gray(`(${formatDuration(result.duration)})`)}\n` +
      `    ${pc.red(error.message)}\n\n` +
      `${responseOutput}\n`
    );
  },

  suiteEnd: (_name: string, stats: TestStats) =>
    `\n  ${statusColor(stats.failed)} - ${stats.total} tests, ${stats.passed} passed, ${stats.failed} failed\n\n`,

  summary: (stats: TestStats) =>
    `${pc.bold("Summary")}\n` +
    `  Total: ${stats.total}\n` +
    `  Passed: ${pc.green(stats.passed.toString())}\n` +
    `  Failed: ${stats.failed > 0 ? pc.red(stats.failed.toString()) : stats.failed}\n` +
    `  Duration: ${(stats.duration / 1000).toFixed(2)}s\n\n`,

  end: () => "",
});
