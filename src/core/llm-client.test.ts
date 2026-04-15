import { test, expect, vi } from "bun:test";
import { createLLMClient } from "./llm-client";
import { isOk, isErr } from "../utils/result";
import type { RuntimeConfig } from "../types";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => () => ({})),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => () => ({})),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => () => ({})),
}));

import { generateText } from "ai";

const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

const createTestConfig = (
  overrides?: Partial<RuntimeConfig>,
): RuntimeConfig => ({
  provider: "openai",
  model: "gpt-4",
  temperature: 0.7,
  timeout: 30000,
  apiKeys: {
    openai: "test-api-key",
    anthropic: "test-ant-key",
  },
  failFast: false,
  ...overrides,
});

test("createLLMClient should call generateText with correct parameters", async () => {
  mockGenerateText.mockResolvedValueOnce({
    text: "Paris is the capital of France",
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: "stop",
    response: {},
  });

  const config = createTestConfig();
  const client = createLLMClient(config);
  const result = await client.complete("What is the capital of France?");

  expect(mockGenerateText).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: "What is the capital of France?",
      temperature: 0.7,
    }),
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.value.content).toBe("Paris is the capital of France");
  }
});

test("createLLMClient should parse response with usage data", async () => {
  mockGenerateText.mockResolvedValueOnce({
    text: "Hello world",
    usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
    finishReason: "stop",
    response: {},
  });

  const config = createTestConfig();
  const client = createLLMClient(config);
  const result = await client.complete("Say hello");

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.value.content).toBe("Hello world");
    expect(result.value.usage).toEqual({
      prompt_tokens: 5,
      completion_tokens: 3,
      total_tokens: 8,
    });
  }
});

test("createLLMClient should handle missing API key", async () => {
  const config = createTestConfig({
    apiKeys: { openai: undefined },
  });
  const client = createLLMClient(config);
  const result = await client.complete("Test query");

  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toContain("No API key provided for provider");
  }
});

test("createLLMClient should handle generateText errors", async () => {
  mockGenerateText.mockRejectedValueOnce(new Error("Network error"));

  const config = createTestConfig();
  const client = createLLMClient(config);
  const result = await client.complete("Test");

  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toBe("Network error");
  }
});

test("createLLMClient should use correct provider from config", async () => {
  mockGenerateText.mockResolvedValueOnce({
    text: "Response from Anthropic",
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: "stop",
    response: {},
  });

  const config = createTestConfig({
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
  });
  const client = createLLMClient(config);
  const result = await client.complete("Test");

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.value.content).toBe("Response from Anthropic");
  }
});

test("createLLMClient should handle finishReason error", async () => {
  mockGenerateText.mockResolvedValueOnce({
    text: "",
    usage: undefined,
    finishReason: "error",
    response: {},
  });

  const config = createTestConfig();
  const client = createLLMClient(config);
  const result = await client.complete("Test");

  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toBe("LLM returned an error");
  }
});

test("createLLMClient should handle empty response content", async () => {
  mockGenerateText.mockResolvedValueOnce({
    text: "",
    usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 },
    finishReason: "stop",
    response: {},
  });

  const config = createTestConfig();
  const client = createLLMClient(config);
  const result = await client.complete("Test");

  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toBe("No response from LLM");
  }
});
