import Mocha, { type MochaOptions, type Runner } from "mocha";
import { createLLMClient, createModel } from "./llm-client";
import { evaluateAllAssertions } from "./assertions";
import { mergeTestConfig } from "./config";
import type {
  RuntimeConfig,
  TestFile,
  Test,
  TestStats,
  LLMResponse,
  AssertionError,
} from "../types";

const createErrorResult = (
  testName: string,
  duration: number,
  message: string,
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

const createSuccessResult = (
  testName: string,
  duration: number,
  response: LLMResponse,
): TestResult => ({
  name: testName,
  passed: true,
  duration,
  response,
});

const createFailureResult = (
  testName: string,
  duration: number,
  response: LLMResponse,
  error: AssertionError,
): TestResult => ({
  name: testName,
  passed: false,
  duration,
  response,
  error,
});

type TestResult = {
  name: string;
  passed: boolean;
  duration: number;
  response: LLMResponse;
  error?: AssertionError;
};

const executeTest = async (
  config: RuntimeConfig,
  test: Test,
): Promise<TestResult> => {
  const testConfig = mergeTestConfig(config, test.config);
  const client = createLLMClient(testConfig);
  const model = createModel(testConfig);

  const startTime = Date.now();
  const response = await client.complete(test.query);
  const duration = Date.now() - startTime;

  if (response.kind === "err") {
    return createErrorResult(test.name, duration, response.error.message);
  }

  const assertionResult = await evaluateAllAssertions(
    response.value,
    test.expect,
    duration,
    model ?? undefined,
  );

  if (assertionResult.pass) {
    return createSuccessResult(test.name, duration, response.value);
  }

  const firstError = assertionResult.errors[0] as AssertionError;
  return createFailureResult(test.name, duration, response.value, firstError);
};

const runTestFile = async (
  config: RuntimeConfig,
  testFile: TestFile,
  filePath: string,
  mochaOptions?: MochaOptions,
): Promise<TestStats> => {
  const mocha = new Mocha({
    reporter: "spec",
    timeout: config.timeout,
    bail: config.failFast,
    ...mochaOptions,
  });

  const suite = Mocha.Suite.create(mocha.suite, testFile.name || filePath);

  for (const test of testFile.tests) {
    const mochaTest = new Mocha.Test(test.name, async function () {
      const result = await executeTest(config, test);

      if (!result.passed) {
        const error = result.error;
        const message = error?.message || "Test failed";
        throw new Error(message);
      }
    });

    suite.addTest(mochaTest);
  }

  return new Promise((resolve) => {
    const startTime = Date.now();

    mocha.run((failures: number) => {
      const duration = Date.now() - startTime;
      const tests = suite.tests;
      const passed = tests.filter((t) => t.state === "passed").length;
      const failed = failures;

      resolve({
        total: tests.length,
        passed,
        failed,
        duration,
      });

      process.stdout.write("\n");
    });
  });
};

const runTestFiles = async (
  config: RuntimeConfig,
  testFiles: ReadonlyArray<{ file: TestFile; path: string }>,
  mochaOptions?: MochaOptions,
): Promise<TestStats> => {
  const mocha = new Mocha({
    reporter: "spec",
    timeout: config.timeout,
    bail: config.failFast,
    ...mochaOptions,
  });

  for (const { file, path } of testFiles) {
    const suite = Mocha.Suite.create(mocha.suite, file.name || path);

    for (const test of file.tests) {
      const mochaTest = new Mocha.Test(test.name, async function () {
        const result = await executeTest(config, test);

        if (!result.passed) {
          const error = result.error;
          const message = error?.message || "Test failed";
          throw new Error(message);
        }
      });

      suite.addTest(mochaTest);
    }
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    let totalTests = 0;
    let passedTests = 0;

    const runner: Runner = mocha.run((failures: number) => {
      const duration = Date.now() - startTime;

      const allSuites = mocha.suite.suites;
      totalTests = allSuites.reduce((acc, s) => acc + s.tests.length, 0);
      passedTests = totalTests - failures;

      resolve({
        total: totalTests,
        passed: passedTests,
        failed: failures,
        duration,
      });
    });

    runner.on("pass", () => {
      passedTests++;
    });
  });
};

export { runTestFile, runTestFiles };
