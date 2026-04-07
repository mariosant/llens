import { z } from "zod";
import { trySync, type Result } from "../utils/result";
import { reduceArray } from "../utils/functional";
import type {
  Assertion,
  LLMResponse,
  ContainsAssertion,
  MatchesAssertion,
  JsonAssertion,
  SchemaAssertion,
  CostAssertion,
  LatencyAssertion,
  AssertionError,
} from "../types";

export interface AssertionResult {
  readonly pass: boolean;
  readonly message: string;
}

export interface AllAssertionsResult {
  readonly pass: boolean;
  readonly errors: ReadonlyArray<AssertionError>;
}

// Individual assertion evaluators - each returns Result
const evaluateContains = (
  response: LLMResponse,
  assertion: ContainsAssertion
): AssertionResult => {
  const pass = response.content.includes(assertion.value);
  return {
    pass,
    message: pass ? "" : `Expected response to contain "${assertion.value}"`,
  };
};

const evaluateMatches = (
  response: LLMResponse,
  assertion: MatchesAssertion
): AssertionResult => {
  const patternResult = trySync(() => {
    const pattern = assertion.pattern;
    const hasSlashNotation = pattern.startsWith("/");
    const lastSlash = hasSlashNotation ? pattern.lastIndexOf("/") : -1;
    const hasFlags = hasSlashNotation && lastSlash > 0;

    const normalizedPattern = hasFlags ? pattern.slice(1, lastSlash) : pattern;
    const flags = hasFlags ? pattern.slice(lastSlash + 1) : "";

    return new RegExp(normalizedPattern, flags);
  });

  return patternResult.kind === "err"
    ? { pass: false, message: `Invalid regex pattern: ${assertion.pattern}` }
    : (() => {
        const pass = patternResult.value.test(response.content);
        return {
          pass,
          message: pass ? "" : `Expected response to match pattern "${assertion.pattern}"`,
        };
      })();
};

const evaluateJson = (
  response: LLMResponse,
  _assertion: JsonAssertion
): AssertionResult => {
  const result = trySync(() => JSON.parse(response.content));

  return result.kind === "ok"
    ? { pass: true, message: "" }
    : { pass: false, message: `Response is not valid JSON: ${result.error.message}` };
};

// Zod type mapping for schema properties
const zodTypeMap: Record<string, () => z.ZodType> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  array: () => z.array(z.unknown()),
  object: () => z.record(z.string(), z.unknown()),
};

const evaluateSchema = (
  response: LLMResponse,
  assertion: SchemaAssertion
): AssertionResult => {
  const parseResult = trySync(() => JSON.parse(response.content));

  if (parseResult.kind === "err") {
    return { pass: false, message: `Invalid JSON: ${parseResult.error.message}` };
  }

  const data = parseResult.value;
  const properties = assertion.schema.properties as Record<string, { type: string }> | undefined;

  if (!properties) {
    return { pass: true, message: "" };
  }

  const shapeEntries = Object.entries(properties).map(([key, value]) => {
    const zodType = zodTypeMap[value.type];
    return [key, zodType ? zodType() : z.unknown()] as const;
  });

  const shape = Object.fromEntries(shapeEntries);
  const schema = z.object(shape);

  const validationResult = trySync(() => {
    const required = assertion.schema.required as string[] | undefined;
    const hasRequired = required && required.length > 0;

    if (hasRequired) {
      const requiredShape = Object.fromEntries(
        required!.map((field) => [field, shape[field]])
      );
      z.object(requiredShape).parse(data);
    } else {
      schema.parse(data);
    }
    return undefined;
  });

  if (validationResult.kind === "ok") {
    return { pass: true, message: "" };
  }

  const error = validationResult.error;
  const isZodError = error instanceof z.ZodError;
  const message = isZodError
    ? `Schema validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`
    : `Schema validation failed: ${error.message}`;

  return { pass: false, message };
};

const evaluateCost = (
  response: LLMResponse,
  assertion: CostAssertion
): AssertionResult => {
  const hasUsage = response.usage !== undefined;
  const noLimit = !assertion.maxTokens && !assertion.maxCost;

  if (!hasUsage) {
    return noLimit
      ? { pass: true, message: "" }
      : { pass: false, message: "No usage data available from LLM response" };
  }

  const overTokenLimit = assertion.maxTokens !== undefined &&
    response.usage!.total_tokens > assertion.maxTokens;

  return overTokenLimit
    ? {
        pass: false,
        message: `Token usage ${response.usage!.total_tokens} exceeds limit ${assertion.maxTokens}`,
      }
    : { pass: true, message: "" };
};

const evaluateLatency = (
  _response: LLMResponse,
  assertion: LatencyAssertion,
  latencyMs: number
): AssertionResult => {
  const overLimit = latencyMs > assertion.maxMs;
  return overLimit
    ? {
        pass: false,
        message: `Response time ${latencyMs}ms exceeds limit ${assertion.maxMs}ms`,
      }
    : { pass: true, message: "" };
};

// Assertion evaluator lookup - replaces switch statement
type AssertionEvaluator = (
  response: LLMResponse,
  assertion: Assertion,
  latencyMs: number
) => AssertionResult;

const assertionEvaluators: Record<Assertion["type"], AssertionEvaluator> = {
  contains: (response, assertion) => evaluateContains(response, assertion as ContainsAssertion),
  matches: (response, assertion) => evaluateMatches(response, assertion as MatchesAssertion),
  json: (response, assertion) => evaluateJson(response, assertion as JsonAssertion),
  schema: (response, assertion) => evaluateSchema(response, assertion as SchemaAssertion),
  cost: (response, assertion) => evaluateCost(response, assertion as CostAssertion),
  latency: (response, assertion, latencyMs) =>
    evaluateLatency(response, assertion as LatencyAssertion, latencyMs),
};

// Single assertion evaluation
export const evaluateAssertion = (
  response: LLMResponse,
  assertion: Assertion,
  latencyMs: number
): AssertionResult => {
  const evaluator = assertionEvaluators[assertion.type];
  return evaluator
    ? evaluator(response, assertion, latencyMs)
    : { pass: false, message: "Unknown assertion type" };
};

// Collect errors from failed assertions using reduce
const collectErrors = (
  response: LLMResponse,
  assertions: readonly Assertion[],
  latencyMs: number
): ReadonlyArray<AssertionError> =>
  reduceArray<Assertion, AssertionError[]>(
    (errors, assertion) => {
      const result = evaluateAssertion(response, assertion, latencyMs);
      return result.pass ? errors : [...errors, { assertion, message: result.message }];
    },
    []
  )(assertions);

// Evaluate all assertions
export const evaluateAllAssertions = (
  response: LLMResponse,
  assertions: readonly Assertion[],
  latencyMs: number
): AllAssertionsResult => {
  const errors = collectErrors(response, assertions, latencyMs);
  return { pass: errors.length === 0, errors };
};
