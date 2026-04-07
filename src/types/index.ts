import { z } from "zod";

// Assertion schemas
export const ContainsAssertionSchema = z.object({
  type: z.literal("contains"),
  value: z.string(),
});

export const MatchesAssertionSchema = z.object({
  type: z.literal("matches"),
  pattern: z.string(),
});

export const JsonAssertionSchema = z.object({
  type: z.literal("json"),
});

export const SchemaAssertionSchema = z.object({
  type: z.literal("schema"),
  schema: z.record(z.string(), z.unknown()),
});

export const CostAssertionSchema = z.object({
  type: z.literal("cost"),
  maxTokens: z.number().optional(),
  maxCost: z.number().optional(),
});

export const LatencyAssertionSchema = z.object({
  type: z.literal("latency"),
  maxMs: z.number(),
});

export const AssertionSchema = z.union([
  ContainsAssertionSchema,
  MatchesAssertionSchema,
  JsonAssertionSchema,
  SchemaAssertionSchema,
  CostAssertionSchema,
  LatencyAssertionSchema,
]);

// Test config schema
export const TestConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  timeout: z.number().optional(),
  response_format: z.record(z.string(), z.unknown()).optional(),
});

// Individual test schema
export const TestSchema = z.object({
  name: z.string(),
  query: z.string(),
  config: TestConfigSchema.optional(),
  expect: z.array(AssertionSchema),
});

// Full test file schema
export const TestFileSchema = z.object({
  name: z.string().optional(),
  config: TestConfigSchema.optional(),
  tests: z.array(TestSchema),
});

// Config file schema
export const ConfigFileSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  timeout: z.number().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

// Inferred types
export type ContainsAssertion = z.infer<typeof ContainsAssertionSchema>;
export type MatchesAssertion = z.infer<typeof MatchesAssertionSchema>;
export type JsonAssertion = z.infer<typeof JsonAssertionSchema>;
export type SchemaAssertion = z.infer<typeof SchemaAssertionSchema>;
export type CostAssertion = z.infer<typeof CostAssertionSchema>;
export type LatencyAssertion = z.infer<typeof LatencyAssertionSchema>;
export type Assertion = z.infer<typeof AssertionSchema>;
export type TestConfig = z.infer<typeof TestConfigSchema>;
export type Test = z.infer<typeof TestSchema>;
export type TestFile = z.infer<typeof TestFileSchema>;
export type ConfigFile = z.infer<typeof ConfigFileSchema>;

// Runtime config (merged from all sources)
export interface RuntimeConfig {
  model: string;
  temperature: number;
  timeout: number;
  apiKey: string;
  baseUrl: string;
  response_format?: Record<string, unknown>;
}

// LLM message format (OpenAI-compatible)
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// LLM request format
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  response_format?: Record<string, unknown>;
}

// LLM response format
export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Test result
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  response: LLMResponse;
  error?: AssertionError;
}

export interface AssertionError {
  assertion: Assertion;
  message: string;
}

// Test statistics
export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

// Formatter interface
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
