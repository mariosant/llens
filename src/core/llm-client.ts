import { ok, err, tryAsync, type Result } from "../utils/result";
import type { RuntimeConfig, LLMResponse, LLMError } from "../types";

// LLM API response types
interface LLMAPIResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}

interface LLMAPIError {
  readonly error?: { readonly message?: string };
}

// Build request body from config and query
const buildRequestBody = (
  config: RuntimeConfig,
  query: string,
): Record<string, unknown> => ({
  model: config.model,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: query },
  ],
  temperature: config.temperature,
  ...(config.response_format && { response_format: config.response_format }),
});

// Parse API response into LLMResponse
const parseResponse = (data: LLMAPIResponse): Result<LLMResponse, LLMError> => {
  const choices = data.choices;

  if (!choices || choices.length === 0) {
    return err({ kind: "llm_error", message: "No response from LLM" });
  }

  const message = choices[0]?.message;

  if (!message) {
    return err({ kind: "llm_error", message: "No message in LLM response" });
  }

  return ok({
    content: message.content || "",
    usage: data.usage,
  });
};

// Handle HTTP error responses
const handleHttpError = async (response: Response): Promise<LLMError> => {
  const data = (await response.json().catch(() => ({}))) as LLMAPIError;
  return {
    kind: "llm_error",
    message: data.error?.message || `HTTP error ${response.status}`,
    status: response.status,
  };
};

// Make API call and handle response
const callLLM = async (
  config: RuntimeConfig,
  query: string,
): Promise<Result<LLMResponse, LLMError>> => {
  const url = `${config.baseUrl}/chat/completions`;
  const body = buildRequestBody(config, query);

  const responseResult = await tryAsync(() =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    }),
  );

  if (responseResult.kind === "err") {
    return err({ kind: "llm_error", message: responseResult.error.message });
  }

  const response = responseResult.value;

  if (!response.ok) {
    return err(await handleHttpError(response));
  }

  const dataResult = await tryAsync(
    () => response.json() as Promise<LLMAPIResponse>,
  );

  if (dataResult.kind === "err") {
    return err({ kind: "llm_error", message: dataResult.error.message });
  }

  return parseResponse(dataResult.value);
};

// Factory function for LLM client (replaces class)
export const createLLMClient = (config: RuntimeConfig) => ({
  complete: (query: string): Promise<Result<LLMResponse, LLMError>> =>
    callLLM(config, query),
});

// Type export for the client
export type LLMClient = ReturnType<typeof createLLMClient>;
