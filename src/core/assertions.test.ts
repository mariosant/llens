import { test, expect } from "bun:test";
import { evaluateAssertion, evaluateAllAssertions } from "./assertions";
import type { LLMResponse } from "../types";

const mockResponse = (
  content: string,
  usage?: LLMResponse["usage"],
): LLMResponse => ({
  content,
  usage,
});

test("contains assertion passes when substring exists", () => {
  const response = mockResponse("The capital of France is Paris");
  const result = evaluateAssertion(
    response,
    { type: "contains", value: "Paris" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("contains assertion fails when substring missing", () => {
  const response = mockResponse("The capital of France is Paris");
  const result = evaluateAssertion(
    response,
    { type: "contains", value: "London" },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("London");
});

test("contains assertion is case-sensitive", () => {
  const response = mockResponse("Paris");
  const result = evaluateAssertion(
    response,
    { type: "contains", value: "paris" },
    100,
  );
  expect(result.pass).toBe(false);
});

test("matches assertion passes with valid regex", () => {
  const response = mockResponse("The year is 2024");
  const result = evaluateAssertion(
    response,
    { type: "matches", pattern: "\\d{4}" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("matches assertion fails when regex doesn't match", () => {
  const response = mockResponse("Hello world");
  const result = evaluateAssertion(
    response,
    { type: "matches", pattern: "\\d+" },
    100,
  );
  expect(result.pass).toBe(false);
});

test("matches assertion supports case-insensitive flag", () => {
  const response = mockResponse("HELLO WORLD");
  const result = evaluateAssertion(
    response,
    { type: "matches", pattern: "/hello/i" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("json assertion passes with valid JSON", () => {
  const response = mockResponse('{"name": "test", "value": 123}');
  const result = evaluateAssertion(response, { type: "json" }, 100);
  expect(result.pass).toBe(true);
});

test("json assertion fails with invalid JSON", () => {
  const response = mockResponse('{"name": "test", value: 123}');
  const result = evaluateAssertion(response, { type: "json" }, 100);
  expect(result.pass).toBe(false);
  expect(result.message).toContain("JSON");
});

test("schema assertion passes with valid object", () => {
  const response = mockResponse('{"name": "test", "age": 25}');
  const result = evaluateAssertion(
    response,
    {
      type: "schema",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      },
    },
    100,
  );
  expect(result.pass).toBe(true);
});

test("schema assertion fails when property missing", () => {
  const response = mockResponse('{"name": "test"}');
  const result = evaluateAssertion(
    response,
    {
      type: "schema",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      },
    },
    100,
  );
  expect(result.pass).toBe(false);
});

test("schema assertion fails with wrong type", () => {
  const response = mockResponse('{"name": "test", "age": "twenty-five"}');
  const result = evaluateAssertion(
    response,
    {
      type: "schema",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      },
    },
    100,
  );
  expect(result.pass).toBe(false);
});

test("cost assertion passes when under token limit", () => {
  const response = mockResponse("Test", {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  });
  const result = evaluateAssertion(
    response,
    { type: "cost", maxTokens: 100 },
    100,
  );
  expect(result.pass).toBe(true);
});

test("cost assertion fails when over token limit", () => {
  const response = mockResponse("Test", {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150,
  });
  const result = evaluateAssertion(
    response,
    { type: "cost", maxTokens: 100 },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("150");
});

test("cost assertion passes when usage undefined and no limit", () => {
  const response = mockResponse("Test");
  const result = evaluateAssertion(response, { type: "cost" }, 100);
  expect(result.pass).toBe(true);
});

test("latency assertion passes when under limit", () => {
  const response = mockResponse("Test");
  const result = evaluateAssertion(
    response,
    { type: "latency", maxMs: 1000 },
    500,
  );
  expect(result.pass).toBe(true);
});

test("latency assertion fails when over limit", () => {
  const response = mockResponse("Test");
  const result = evaluateAssertion(
    response,
    { type: "latency", maxMs: 500 },
    1000,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("1000ms");
});

test("evaluateAllAssertions passes when all assertions pass", () => {
  const response = mockResponse('{"name": "test"}');
  const assertions = [
    { type: "contains" as const, value: "name" },
    { type: "json" as const },
  ];
  const result = evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test("evaluateAllAssertions fails when any assertion fails", () => {
  const response = mockResponse("hello world");
  const assertions = [
    { type: "contains" as const, value: "hello" },
    { type: "contains" as const, value: "missing" },
    { type: "json" as const },
  ];
  const result = evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(false);
  expect(result.errors).toHaveLength(2);
});

test("evaluateAllAssertions collects all errors", () => {
  const response = mockResponse("test");
  const assertions = [
    { type: "contains" as const, value: "missing1" },
    { type: "contains" as const, value: "missing2" },
  ];
  const result = evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(false);
  expect(result.errors).toHaveLength(2);
});
