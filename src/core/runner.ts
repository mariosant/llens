import { LLMClient } from "./llm-client";
import { evaluateAllAssertions } from "./assertions";
import { mergeConfigs } from "./config";
import type { RuntimeConfig, TestFile, Test, TestResult, TestStats } from "../types";
import type { Formatter } from "../formatters/base";

export class TestRunner {
  private config: RuntimeConfig;
  private formatter: Formatter;

  constructor(config: RuntimeConfig, formatter: Formatter) {
    this.config = config;
    this.formatter = formatter;
  }

  async runTestFile(testFile: TestFile, filePath: string): Promise<TestStats> {
    this.formatter.suiteStart(testFile.name || filePath);
    
    const stats: TestStats = {
      total: testFile.tests.length,
      passed: 0,
      failed: 0,
      duration: 0,
    };

    const startTime = Date.now();

    for (const test of testFile.tests) {
      const result = await this.runTest(test);
      if (result.passed) {
        stats.passed++;
        this.formatter.testPass(test.name, result);
      } else {
        stats.failed++;
        this.formatter.testFail(test.name, result, result.error!);
      }
    }

    stats.duration = Date.now() - startTime;
    this.formatter.suiteEnd(testFile.name || filePath, stats);
    
    return stats;
  }

  private async runTest(test: Test): Promise<TestResult> {
    const testConfig = mergeConfigs(this.config, {}, test.config);
    const client = new LLMClient(testConfig);
    
    this.formatter.testStart(test.name);
    
    const startTime = Date.now();
    let response;
    
    try {
      response = await client.complete(test.query);
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: test.name,
        passed: false,
        duration,
        response: { content: "" },
        error: {
          assertion: { type: "contains", value: "successful response" },
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
    
    const duration = Date.now() - startTime;
    const assertionResult = evaluateAllAssertions(response, test.expect, duration);
    
    if (assertionResult.pass) {
      return {
        name: test.name,
        passed: true,
        duration,
        response,
      };
    } else {
      return {
        name: test.name,
        passed: false,
        duration,
        response,
        error: assertionResult.errors[0],
      };
    }
  }
}
