import { createLLMClient } from "./llm-client";
import { evaluateAllAssertions } from "./assertions";
import { mergeTestConfig } from "./config";
import { reduceArray, traverse } from "../utils/functional";
import type {
  RuntimeConfig,
  TestFile,
  Test,
  TestResult,
  TestStats,
  Formatter,
  LLMResponse,
  AssertionError,
} from "../types";

// Aggregate stats from multiple results
const aggregateStats = (results: ReadonlyArray<TestResult>): TestStats =>
  reduceArray<TestResult, TestStats>(
    (acc, result) => ({
      total: acc.total + 1,
      passed: acc.passed + (result.passed ? 1 : 0),
      failed: acc.failed + (result.passed ? 0 : 1),
      duration: acc.duration + result.duration,
    }),
    { total: 0, passed: 0, failed: 0, duration: 0 }
  )(results);

// Create error result for LLM failures
const createErrorResult = (
  testName: string,
  duration: number,
  message: string
): TestResult => ({
  name: testName,
  passed: false,
  duration,
  response: { content: "" },
  error: {
    assertion: { type: "contains", value: "successful response" },
    message,
  },
});

// Create success result
const createSuccessResult = (
  testName: string,
  duration: number,
  response: LLMResponse
): TestResult => ({
  name: testName,
  passed: true,
  duration,
  response,
});

// Create failure result from assertion error
const createFailureResult = (
  testName: string,
  duration: number,
  response: LLMResponse,
  error: AssertionError
): TestResult => ({
  name: testName,
  passed: false,
  duration,
  response,
  error,
});

// Run a single test (pure function)
const runTest = async (
  config: RuntimeConfig,
  test: Test
): Promise<TestResult> => {
  const testConfig = mergeTestConfig(config, test.config);
  const client = createLLMClient(testConfig);

  const startTime = Date.now();
  const response = await client.complete(test.query);
  const duration = Date.now() - startTime;

  // Handle LLM error
  if (response.kind === "err") {
    return createErrorResult(test.name, duration, response.error.message);
  }

  const assertionResult = evaluateAllAssertions(response.value, test.expect, duration);

  // Return based on assertion results
  if (assertionResult.pass) {
    return createSuccessResult(test.name, duration, response.value);
  }
  // errors array is non-empty when pass is false (by construction in evaluateAllAssertions)
  const firstError = assertionResult.errors[0] as AssertionError;
  return createFailureResult(test.name, duration, response.value, firstError);
};

// Run tests and collect results (pure function)
const runTests = (
  config: RuntimeConfig,
  tests: readonly Test[]
): Promise<ReadonlyArray<TestResult>> =>
  traverse<Test, TestResult>((test) => runTest(config, test))(tests);

// Format test results (pure, returns string)
const formatResults = (
  results: ReadonlyArray<TestResult>,
  formatter: Formatter
): string =>
  results
    .map((result) => {
      if (result.passed) {
        return formatter.testPass(result.name, result);
      }
      // result is failure case which has 'error' property
      return formatter.testFail(result.name, result, result.error);
    })
    .join("");

// Run a test file with formatter callbacks
export const runTestFile = async (
  config: RuntimeConfig,
  formatter: Formatter,
  testFile: TestFile,
  filePath: string
): Promise<TestStats> => {
  const suiteName = testFile.name || filePath;

  // Output suite start
  process.stdout.write(formatter.suiteStart(suiteName));

  const startTime = Date.now();
  const results = await runTests(config, testFile.tests);
  const duration = Date.now() - startTime;

  // Output individual test results
  process.stdout.write(formatResults(results, formatter));

  // Calculate and output stats
  const stats: TestStats = {
    ...aggregateStats(results),
    duration,
  };

  process.stdout.write(formatter.suiteEnd(suiteName, stats));

  return stats;
};

// Run multiple test files
export const runTestFiles = async (
  config: RuntimeConfig,
  formatter: Formatter,
  testFiles: ReadonlyArray<{ file: TestFile; path: string }>
): Promise<TestStats> => {
  process.stdout.write(formatter.start());

  const allStats = await traverse<{ file: TestFile; path: string }, TestStats>(
    ({ file, path }) => runTestFile(config, formatter, file, path)
  )(testFiles);

  // Aggregate all stats
  const totalStats = reduceArray<TestStats, TestStats>(
    (acc, stats) => ({
      total: acc.total + stats.total,
      passed: acc.passed + stats.passed,
      failed: acc.failed + stats.failed,
      duration: acc.duration + stats.duration,
    }),
    { total: 0, passed: 0, failed: 0, duration: 0 }
  )(allStats);

  process.stdout.write(formatter.summary(totalStats));
  process.stdout.write(formatter.end());

  return totalStats;
};