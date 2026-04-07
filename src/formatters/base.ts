import type { TestResult, TestStats, AssertionError } from "../types";

// Formatter function type - returns strings instead of side effects
export interface Formatter {
  readonly start: () => string;
  readonly suiteStart: (name: string) => string;
  readonly testStart: (name: string) => string;
  readonly testPass: (name: string, result: TestResult) => string;
  readonly testFail: (name: string, result: TestResult, error: AssertionError) => string;
  readonly suiteEnd: (name: string, stats: TestStats) => string;
  readonly summary: (stats: TestStats) => string;
  readonly end: () => string;
}
