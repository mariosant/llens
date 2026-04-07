import { z } from "zod";
import type { Result } from "../utils/result";

// Error types
export interface LLMError {
  readonly kind: 'llm_error';
  readonly message: string;
  readonly status?: number;
}

export interface ParseError {
  readonly kind: 'parse_error';
  readonly message: string;
  readonly filePath: string;
}

export interface ConfigError {
  readonly kind: 'config_error';
  readonly message: string;
}

export type AppError = LLMError | ParseError | ConfigError;

// Async result alias
export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>;

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
  readonly model: string;
  readonly temperature: number;
  readonly timeout: number;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly response_format?: Record<string, unknown>;
}

// LLM message format (OpenAI-compatible)
export interface LLMMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

// LLM request format
export interface LLMRequest {
  readonly model: string;
  readonly messages: LLMMessage[];
  readonly temperature?: number;
  readonly response_format?: Record<string, unknown>;
}

// LLM response format
export interface LLMResponse {
  readonly content: string;
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}

// Assertion error
export interface AssertionError {
  readonly assertion: Assertion;
  readonly message: string;
}

// Test statistics
export interface TestStats {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly duration: number;
}

// Formatter functions (pure, no side effects)
export interface FormatterOutput {
  readonly suiteStart: (name: string) => string;
  readonly suiteEnd: (name: string, stats: TestStats) => string;
  readonly testPass: (name: string, result: TestResult) => string;
  readonly testFail: (name: string, result: TestResult, error: AssertionError) => string;
  readonly testStart: (name: string) => string;
  readonly summary: (stats: TestStats) => string;
  readonly start: () => string;
  readonly end: () => string;
}

// Old Formatter interface is deprecated - mark as such but keep for backward compat
/** @deprecated Use FormatterOutput instead */
export interface Formatter extends FormatterOutput {}

// Test result (Result pattern)
export type TestResult = 
  | { readonly name: string; readonly passed: true; readonly duration: number; readonly response: LLMResponse }
  | { readonly name: string; readonly passed: false; readonly duration: number; readonly response: LLMResponse; readonly error: AssertionError };

// Configuration levels
export type ConfigLevel = 'default' | 'file' | 'env' | 'test' | 'cli';

// Runner state (immutable)
export interface RunnerState {
  readonly config: RuntimeConfig;
  readonly formatter: FormatterOutput;
}

// Test execution result with stats
export interface ExecutionResult {
  readonly results: readonly TestResult[];
  readonly stats: TestStats;
}
