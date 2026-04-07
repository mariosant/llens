import type { Formatter } from "./base";
import type { TestResult, TestStats, AssertionError } from "../types";
import pc from "picocolors";

export class PlainFormatter implements Formatter {
  start(): void {
    console.log();
  }

  suiteStart(name: string): void {
    console.log(pc.bold(name));
    console.log();
  }

  testStart(_name: string): void {
    // No-op for plain formatter
  }

  testPass(name: string, result: TestResult): void {
    const duration = result.duration < 1000 
      ? `${result.duration}ms` 
      : `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`  ${pc.green("✓")} ${name} ${pc.gray(`(${duration})`)}`);
  }

  testFail(name: string, result: TestResult, error: AssertionError): void {
    const duration = result.duration < 1000 
      ? `${result.duration}ms` 
      : `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`  ${pc.red("✗")} ${name} ${pc.gray(`(${duration})`)}`);
    console.log(`    ${pc.red(error.message)}`);
  }

  suiteEnd(_name: string, stats: TestStats): void {
    console.log();
    const status = stats.failed === 0 ? pc.green("PASS") : pc.red("FAIL");
    console.log(`  ${status} - ${stats.total} tests, ${stats.passed} passed, ${stats.failed} failed`);
    console.log();
  }

  summary(stats: TestStats): void {
    console.log(pc.bold("Summary"));
    console.log(`  Total: ${stats.total}`);
    console.log(`  Passed: ${pc.green(stats.passed.toString())}`);
    console.log(`  Failed: ${stats.failed > 0 ? pc.red(stats.failed.toString()) : stats.failed}`);
    console.log(`  Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log();
  }

  end(): void {
    // No-op
  }
}
