import { z } from "zod";
import type {
  Assertion,
  LLMResponse,
  ContainsAssertion,
  MatchesAssertion,
  JsonAssertion,
  SchemaAssertion,
  CostAssertion,
  LatencyAssertion,
} from "../types";

export interface AssertionResult {
  pass: boolean;
  message: string;
}

export interface AllAssertionsResult {
  pass: boolean;
  errors: Array<{ assertion: Assertion; message: string }>;
}

export function evaluateAssertion(
  response: LLMResponse,
  assertion: Assertion,
  latencyMs: number
): AssertionResult {
  switch (assertion.type) {
    case "contains":
      return evaluateContains(response, assertion);
    case "matches":
      return evaluateMatches(response, assertion);
    case "json":
      return evaluateJson(response, assertion);
    case "schema":
      return evaluateSchema(response, assertion);
    case "cost":
      return evaluateCost(response, assertion);
    case "latency":
      return evaluateLatency(response, assertion, latencyMs);
    default:
      return { pass: false, message: `Unknown assertion type` };
  }
}

function evaluateContains(
  response: LLMResponse,
  assertion: ContainsAssertion
): AssertionResult {
  const pass = response.content.includes(assertion.value);
  return {
    pass,
    message: pass
      ? ""
      : `Expected response to contain "${assertion.value}"`,
  };
}

function evaluateMatches(
  response: LLMResponse,
  assertion: MatchesAssertion
): AssertionResult {
  try {
    // Check if pattern includes regex literal notation like /pattern/flags
    let pattern = assertion.pattern;
    let flags = "";
    
    if (pattern.startsWith("/")) {
      const lastSlash = pattern.lastIndexOf("/");
      if (lastSlash > 0) {
        flags = pattern.slice(lastSlash + 1);
        pattern = pattern.slice(1, lastSlash);
      }
    }
    
    const regex = new RegExp(pattern, flags);
    const pass = regex.test(response.content);
    return {
      pass,
      message: pass
        ? ""
        : `Expected response to match pattern "${assertion.pattern}"`,
    };
  } catch (error) {
    return {
      pass: false,
      message: `Invalid regex pattern: ${assertion.pattern}`,
    };
  }
}

function evaluateJson(
  response: LLMResponse,
  _assertion: JsonAssertion
): AssertionResult {
  try {
    JSON.parse(response.content);
    return { pass: true, message: "" };
  } catch (error) {
    return {
      pass: false,
      message: `Response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function evaluateSchema(
  response: LLMResponse,
  assertion: SchemaAssertion
): AssertionResult {
  try {
    const data = JSON.parse(response.content);
    const schema = z.object(
      Object.fromEntries(
        Object.entries(assertion.schema.properties || {}).map(([key, value]) => {
          const prop = value as { type: string };
          switch (prop.type) {
            case "string":
              return [key, z.string()];
            case "number":
              return [key, z.number()];
            case "boolean":
              return [key, z.boolean()];
            case "array":
              return [key, z.array(z.unknown())];
            case "object":
              return [key, z.record(z.string(), z.unknown())];
            default:
              return [key, z.unknown()];
          }
        })
      )
    );

    // If required fields are specified, validate them
    if (assertion.schema.required && Array.isArray(assertion.schema.required)) {
      const requiredFields = assertion.schema.required as string[];
      const requiredSchema = z.object(
        Object.fromEntries(
          requiredFields.map((field) => [field, schema.shape[field]])
        )
      );
      requiredSchema.parse(data);
    } else {
      schema.parse(data);
    }

    return { pass: true, message: "" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        pass: false,
        message: `Schema validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`,
      };
    }
    return {
      pass: false,
      message: `Invalid JSON or schema: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function evaluateCost(
  response: LLMResponse,
  assertion: CostAssertion
): AssertionResult {
  if (!response.usage) {
    // If no usage data available and no strict limit, pass
    if (!assertion.maxTokens && !assertion.maxCost) {
      return { pass: true, message: "" };
    }
    return {
      pass: false,
      message: "No usage data available from LLM response",
    };
  }

  if (assertion.maxTokens !== undefined) {
    if (response.usage.total_tokens > assertion.maxTokens) {
      return {
        pass: false,
        message: `Token usage ${response.usage.total_tokens} exceeds limit ${assertion.maxTokens}`,
      };
    }
  }

  // Note: Cost calculation would require pricing info, which we don't have
  // For now, we just check token limits

  return { pass: true, message: "" };
}

function evaluateLatency(
  _response: LLMResponse,
  assertion: LatencyAssertion,
  latencyMs: number
): AssertionResult {
  if (latencyMs > assertion.maxMs) {
    return {
      pass: false,
      message: `Response time ${latencyMs}ms exceeds limit ${assertion.maxMs}ms`,
    };
  }
  return { pass: true, message: "" };
}

export function evaluateAllAssertions(
  response: LLMResponse,
  assertions: Assertion[],
  latencyMs: number
): AllAssertionsResult {
  const errors: Array<{ assertion: Assertion; message: string }> = [];

  for (const assertion of assertions) {
    const result = evaluateAssertion(response, assertion, latencyMs);
    if (!result.pass) {
      errors.push({ assertion, message: result.message });
    }
  }

  return {
    pass: errors.length === 0,
    errors,
  };
}
