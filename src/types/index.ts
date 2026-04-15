import { z } from "zod";
import type { Result } from "../utils/result";

// Error types
export interface LLMError {
  readonly kind: "llm_error";
  readonly message: string;
  readonly status?: number;
}

export interface ParseError {
  readonly kind: "parse_error";
  readonly message: string;
  readonly filePath: string;
}

export interface ConfigError {
  readonly kind: "config_error";
  readonly message: string;
}

export type AppError = LLMError | ParseError | ConfigError;

// Async result alias
export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>;

// Provider types
export const LLMProviderSchema = z.enum(["openai", "anthropic", "google"]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Provider API keys map
export interface ProviderAPIKeys {
  readonly openai?: string;
  readonly anthropic?: string;
  readonly google?: string;
}

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

export const LanguageAssertionSchema = z.union([
  z.object({
    type: z.literal("language"),
    code: z.string(),
  }),
  z.object({
    type: z.literal("language"),
    anyOf: z.array(z.string()),
  }),
  z.object({
    type: z.literal("language"),
    not: z.array(z.string()),
  }),
]);

export const ToxicityAssertionSchema = z.object({
  type: z.literal("toxicity"),
  threshold: z.number().min(0).max(1),
});

export const AssertionSchema = z.union([
  ContainsAssertionSchema,
  MatchesAssertionSchema,
  JsonAssertionSchema,
  SchemaAssertionSchema,
  CostAssertionSchema,
  LatencyAssertionSchema,
  LanguageAssertionSchema,
  ToxicityAssertionSchema,
]);

// Test config schema
export const TestConfigSchema = z.object({
  provider: LLMProviderSchema.optional(),
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

// Provider config (for nested config structure)
export const ProviderConfigSchema = z.object({
  apiKey: z.string(),
});

// Full test file schema
export const TestFileSchema = z.object({
  name: z.string().optional(),
  config: TestConfigSchema.optional(),
  tests: z.array(TestSchema),
});

// Config file schema (nested providers structure)
export const ConfigFileSchema = z.object({
  defaults: z
    .object({
      provider: LLMProviderSchema.optional(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      timeout: z.number().optional(),
    })
    .optional(),
  providers: z
    .object({
      openai: ProviderConfigSchema.optional(),
      anthropic: ProviderConfigSchema.optional(),
      google: ProviderConfigSchema.optional(),
    })
    .optional(),
  failFast: z.boolean().optional(),
});

// Inferred types
export type ContainsAssertion = z.infer<typeof ContainsAssertionSchema>;
export type MatchesAssertion = z.infer<typeof MatchesAssertionSchema>;
export type JsonAssertion = z.infer<typeof JsonAssertionSchema>;
export type SchemaAssertion = z.infer<typeof SchemaAssertionSchema>;
export type CostAssertion = z.infer<typeof CostAssertionSchema>;
export type LatencyAssertion = z.infer<typeof LatencyAssertionSchema>;
export type LanguageAssertion = z.infer<typeof LanguageAssertionSchema>;
export type ToxicityAssertion = z.infer<typeof ToxicityAssertionSchema>;
export type Assertion = z.infer<typeof AssertionSchema>;
export type TestConfig = z.infer<typeof TestConfigSchema>;
export type Test = z.infer<typeof TestSchema>;
export type TestFile = z.infer<typeof TestFileSchema>;
export type ConfigFile = z.infer<typeof ConfigFileSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Runtime config (merged from all sources)
export interface RuntimeConfig {
  readonly provider: LLMProvider;
  readonly model: string;
  readonly temperature: number;
  readonly timeout: number;
  readonly apiKeys: ProviderAPIKeys;
  readonly failFast: boolean;
}

// LLM message format (OpenAI-compatible)
export interface LLMMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

// LLM request format
export interface LLMRequest {
  readonly provider: LLMProvider;
  readonly model: string;
  readonly messages: LLMMessage[];
  readonly temperature?: number;
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

// Test result (Result pattern)
export type TestResult =
  | {
      readonly name: string;
      readonly passed: true;
      readonly duration: number;
      readonly response: LLMResponse;
    }
  | {
      readonly name: string;
      readonly passed: false;
      readonly duration: number;
      readonly response: LLMResponse;
      readonly error: AssertionError;
    };

// Configuration levels
export type ConfigLevel = "default" | "file" | "env" | "test" | "cli";
