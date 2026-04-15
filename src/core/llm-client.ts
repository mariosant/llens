import { generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ok, err, type Result } from "../utils/result";
import type {
  RuntimeConfig,
  LLMResponse,
  LLMError,
  LLMProvider,
} from "../types";
import { getProviderAPIKey } from "./config";

const getModel = (
  provider: LLMProvider,
  model: string,
  apiKey: string,
): LanguageModel => {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model);
    }
  }
};

export const createModel = (config: RuntimeConfig): LanguageModel | null => {
  const apiKey = getProviderAPIKey(config, config.provider);
  if (!apiKey) {
    return null;
  }
  return getModel(config.provider, config.model, apiKey);
};

const parseResponse = (
  content: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  },
): Result<LLMResponse, LLMError> => {
  if (!content) {
    return err({ kind: "llm_error", message: "No response from LLM" });
  }

  return ok({
    content,
    usage: usage
      ? {
          prompt_tokens: usage.promptTokens ?? 0,
          completion_tokens: usage.completionTokens ?? 0,
          total_tokens: usage.totalTokens ?? 0,
        }
      : undefined,
  });
};

const callLLM = async (
  config: RuntimeConfig,
  query: string,
): Promise<Result<LLMResponse, LLMError>> => {
  const apiKey = getProviderAPIKey(config, config.provider);

  if (!apiKey) {
    return err({
      kind: "llm_error",
      message: `No API key provided for provider: ${config.provider}`,
    });
  }

  try {
    const model = getModel(config.provider, config.model, apiKey);

    const { text, usage, finishReason } = await generateText({
      model,
      prompt: query,
      temperature: config.temperature,
    });

    if (finishReason === "error") {
      return err({ kind: "llm_error", message: "LLM returned an error" });
    }

    return parseResponse(text, usage);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown LLM error";
    return err({ kind: "llm_error", message });
  }
};

export const createLLMClient = (config: RuntimeConfig) => ({
  complete: (query: string): Promise<Result<LLMResponse, LLMError>> =>
    callLLM(config, query),
});

export type LLMClient = ReturnType<typeof createLLMClient>;
