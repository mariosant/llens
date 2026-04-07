import { test, expect } from "bun:test";
import { LLMClient } from "./llm-client";
import type { RuntimeConfig } from "../types";

test("LLMClient should send correct request format", async () => {
  let capturedUrl: string | null = null;
  let capturedOptions: RequestInit | null = null;
  
  // Mock fetch
  const originalFetch = global.fetch;
  global.fetch = async (url: string | Request, options?: RequestInit) => {
    capturedUrl = url.toString();
    capturedOptions = options || null;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Hello" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  await client.complete("Test query");
  
  expect(capturedUrl).toBe("https://api.test.com/v1/chat/completions");
  expect(capturedOptions).not.toBeNull();
  expect(capturedOptions!.method).toBe("POST");
  
  const headers = capturedOptions!.headers as Record<string, string>;
  expect(headers["Authorization"]).toBe("Bearer test-key");
  expect(headers["Content-Type"]).toBe("application/json");
  
  const body = JSON.parse(capturedOptions!.body as string);
  expect(body.model).toBe("gpt-4");
  expect(body.temperature).toBe(0.7);
  expect(body.messages).toHaveLength(2);
  expect(body.messages[0].role).toBe("system");
  expect(body.messages[1].role).toBe("user");
  expect(body.messages[1].content).toBe("Test query");
  
  // Restore fetch
  global.fetch = originalFetch;
});

test("LLMClient should parse response correctly", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Paris is the capital" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  const response = await client.complete("What is the capital of France?");
  
  expect(response.content).toBe("Paris is the capital");
  expect(response.usage).toEqual({
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
  });
  
  global.fetch = originalFetch;
});

test("LLMClient should include response_format when specified", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  
  const originalFetch = global.fetch;
  global.fetch = async (_url: string | Request, options?: RequestInit) => {
    capturedBody = JSON.parse(options?.body as string);
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    response_format: { type: "json_object" },
  };
  
  const client = new LLMClient(config);
  await client.complete("Return JSON");
  
  expect(capturedBody).not.toBeNull();
  expect(capturedBody!.response_format).toEqual({ type: "json_object" });
  
  global.fetch = originalFetch;
});

test("LLMClient should handle API errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: { message: "Invalid API key", type: "authentication_error" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "invalid-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  
  await expect(client.complete("Test")).rejects.toThrow("Invalid API key");
  
  global.fetch = originalFetch;
});

test("LLMClient should handle network errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Network error");
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  
  await expect(client.complete("Test")).rejects.toThrow("Network error");
  
  global.fetch = originalFetch;
});

test("LLMClient should handle empty choices", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  
  await expect(client.complete("Test")).rejects.toThrow("No response from LLM");
  
  global.fetch = originalFetch;
});

test("LLMClient should handle missing usage data", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Hello" } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  
  const config: RuntimeConfig = {
    model: "gpt-4",
    temperature: 0.7,
    timeout: 30000,
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
  };
  
  const client = new LLMClient(config);
  const response = await client.complete("Test");
  
  expect(response.content).toBe("Hello");
  expect(response.usage).toBeUndefined();
  
  global.fetch = originalFetch;
});
