import type { TestResult, TestStats, AssertionError } from "../types";

export interface Formatter {
  start(): void;
  suiteStart(name: string): void;
  testStart(name: string): void;
  testPass(name: string, result: TestResult): void;
  testFail(name: string, result: TestResult, error: AssertionError): void;
  suiteEnd(name: string, stats: TestStats): void;
  summary(stats: TestStats): void;
  end(): void;
}
