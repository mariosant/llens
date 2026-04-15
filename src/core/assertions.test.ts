import { test, expect, vi } from "bun:test";
import { evaluateAssertion, evaluateAllAssertions } from "./assertions";
import type { LLMResponse } from "../types";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

const mockResponse = (
  content: string,
  usage?: LLMResponse["usage"],
): LLMResponse => ({
  content,
  usage,
});

test("contains assertion passes when substring exists", async () => {
  const response = mockResponse("The capital of France is Paris");
  const result = await evaluateAssertion(
    response,
    { type: "contains", value: "Paris" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("contains assertion fails when substring missing", async () => {
  const response = mockResponse("The capital of France is Paris");
  const result = await evaluateAssertion(
    response,
    { type: "contains", value: "London" },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("London");
});

test("contains assertion is case-sensitive", async () => {
  const response = mockResponse("Paris");
  const result = await evaluateAssertion(
    response,
    { type: "contains", value: "paris" },
    100,
  );
  expect(result.pass).toBe(false);
});

test("matches assertion passes with valid regex", async () => {
  const response = mockResponse("The year is 2024");
  const result = await evaluateAssertion(
    response,
    { type: "matches", pattern: "\\d{4}" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("matches assertion fails when regex doesn't match", async () => {
  const response = mockResponse("Hello world");
  const result = await evaluateAssertion(
    response,
    { type: "matches", pattern: "\\d+" },
    100,
  );
  expect(result.pass).toBe(false);
});

test("matches assertion supports case-insensitive flag", async () => {
  const response = mockResponse("HELLO WORLD");
  const result = await evaluateAssertion(
    response,
    { type: "matches", pattern: "/hello/i" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("json assertion passes with valid JSON", async () => {
  const response = mockResponse('{"name": "test", "value": 123}');
  const result = await evaluateAssertion(response, { type: "json" }, 100);
  expect(result.pass).toBe(true);
});

test("json assertion fails with invalid JSON", async () => {
  const response = mockResponse('{"name": "test", value: 123}');
  const result = await evaluateAssertion(response, { type: "json" }, 100);
  expect(result.pass).toBe(false);
  expect(result.message).toContain("JSON");
});

test("schema assertion passes with valid object", async () => {
  const response = mockResponse('{"name": "test", "age": 25}');
  const result = await evaluateAssertion(
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

test("schema assertion fails when property missing", async () => {
  const response = mockResponse('{"name": "test"}');
  const result = await evaluateAssertion(
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

test("schema assertion fails with wrong type", async () => {
  const response = mockResponse('{"name": "test", "age": "twenty-five"}');
  const result = await evaluateAssertion(
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

test("cost assertion passes when under token limit", async () => {
  const response = mockResponse("Test", {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  });
  const result = await evaluateAssertion(
    response,
    { type: "cost", maxTokens: 100 },
    100,
  );
  expect(result.pass).toBe(true);
});

test("cost assertion fails when over token limit", async () => {
  const response = mockResponse("Test", {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150,
  });
  const result = await evaluateAssertion(
    response,
    { type: "cost", maxTokens: 100 },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("150");
});

test("cost assertion passes when usage undefined and no limit", async () => {
  const response = mockResponse("Test");
  const result = await evaluateAssertion(response, { type: "cost" }, 100);
  expect(result.pass).toBe(true);
});

test("latency assertion passes when under limit", async () => {
  const response = mockResponse("Test");
  const result = await evaluateAssertion(
    response,
    { type: "latency", maxMs: 1000 },
    500,
  );
  expect(result.pass).toBe(true);
});

test("latency assertion fails when over limit", async () => {
  const response = mockResponse("Test");
  const result = await evaluateAssertion(
    response,
    { type: "latency", maxMs: 500 },
    1000,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("1000ms");
});

test("language assertion passes when code matches", async () => {
  const response = mockResponse("The capital of France is Paris");
  const result = await evaluateAssertion(
    response,
    { type: "language", code: "eng" },
    100,
  );
  expect(result.pass).toBe(true);
});

test("language assertion fails when code does not match", async () => {
  const response = mockResponse("Bonjour, comment allez-vous?");
  const result = await evaluateAssertion(
    response,
    { type: "language", code: "eng" },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("fra");
});

test("language assertion passes with anyOf when language matches", async () => {
  const response = mockResponse("Hola, como estas?");
  const result = await evaluateAssertion(
    response,
    { type: "language", anyOf: ["eng", "spa", "fra"] },
    100,
  );
  expect(result.pass).toBe(true);
});

test("language assertion fails with anyOf when language not in list", async () => {
  const response = mockResponse("Ein kurzer Satz auf Deutsch");
  const result = await evaluateAssertion(
    response,
    { type: "language", anyOf: ["eng", "spa", "fra"] },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("deu");
});

test("language assertion passes with not when language excluded", async () => {
  const response = mockResponse("This is an English sentence.");
  const result = await evaluateAssertion(
    response,
    { type: "language", not: ["fra", "deu", "spa"] },
    100,
  );
  expect(result.pass).toBe(true);
});

test("language assertion fails with not when language included", async () => {
  const response = mockResponse("Esto es una frase en espanol.");
  const result = await evaluateAssertion(
    response,
    { type: "language", not: ["spa"] },
    100,
  );
  expect(result.pass).toBe(false);
  expect(result.message).toContain("spa");
});

test("language assertion fails gracefully for very short text", async () => {
  const response = mockResponse("Hi");
  const result = await evaluateAssertion(
    response,
    { type: "language", code: "eng" },
    100,
  );
  expect(result.pass).toBe(false);
});

test("evaluateAllAssertions passes when all assertions pass", async () => {
  const response = mockResponse('{"name": "test"}');
  const assertions = [
    { type: "contains" as const, value: "name" },
    { type: "json" as const },
  ];
  const result = await evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test("evaluateAllAssertions fails when any assertion fails", async () => {
  const response = mockResponse("hello world");
  const assertions = [
    { type: "contains" as const, value: "hello" },
    { type: "contains" as const, value: "missing" },
    { type: "json" as const },
  ];
  const result = await evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(false);
  expect(result.errors).toHaveLength(2);
});

test("evaluateAllAssertions collects all errors", async () => {
  const response = mockResponse("test");
  const assertions = [
    { type: "contains" as const, value: "missing1" },
    { type: "contains" as const, value: "missing2" },
  ];
  const result = await evaluateAllAssertions(response, assertions, 100);
  expect(result.pass).toBe(false);
  expect(result.errors).toHaveLength(2);
});

import { generateObject } from "ai";
import type { LanguageModel } from "ai";

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

const mockModel = {} as LanguageModel;

test("toxicity assertion passes when below threshold", async () => {
  mockGenerateObject.mockResolvedValueOnce({
    object: { toxicity: 0.1 },
  });

  const response = mockResponse("This is a friendly response");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.3 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(true);
  expect(result.message).toBe("");
});

test("toxicity assertion fails when above threshold", async () => {
  mockGenerateObject.mockResolvedValueOnce({
    object: { toxicity: 0.8 },
  });

  const response = mockResponse("This is a toxic response");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.3 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(false);
  expect(result.message).toContain("0.8");
  expect(result.message).toContain("0.3");
});

test("toxicity assertion passes when exactly at threshold", async () => {
  mockGenerateObject.mockResolvedValueOnce({
    object: { toxicity: 0.5 },
  });

  const response = mockResponse("Borderline content");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.5 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(true);
});

test("toxicity assertion fails when no model provided", async () => {
  const response = mockResponse("Any content");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.5 },
    100,
  );

  expect(result.pass).toBe(false);
  expect(result.message).toContain("No LLM client available");
});

test("toxicity assertion handles LLM errors gracefully", async () => {
  mockGenerateObject.mockRejectedValueOnce(new Error("API error"));

  const response = mockResponse("Any content");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.5 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(false);
  expect(result.message).toContain("Toxicity check failed");
  expect(result.message).toContain("API error");
});

test("toxicity assertion with threshold of 0", async () => {
  mockGenerateObject.mockResolvedValueOnce({
    object: { toxicity: 0.0 },
  });

  const response = mockResponse("Perfectly clean content");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 0.0 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(true);
});

test("toxicity assertion with threshold of 1", async () => {
  mockGenerateObject.mockResolvedValueOnce({
    object: { toxicity: 0.99 },
  });

  const response = mockResponse("Almost completely toxic");
  const result = await evaluateAssertion(
    response,
    { type: "toxicity", threshold: 1.0 },
    100,
    mockModel,
  );

  expect(result.pass).toBe(true);
});
