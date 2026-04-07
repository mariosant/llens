import type { RuntimeConfig, LLMResponse } from "../types";

export class LLMClient {
  private config: RuntimeConfig;

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  async complete(query: string): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;
    
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: this.config.temperature,
    };

    if (this.config.response_format) {
      body.response_format = this.config.response_format;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message || `HTTP error ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from LLM");
    }

    const message = data.choices[0]!.message;
    if (!message) {
      throw new Error("No message in LLM response");
    }

    return {
      content: message.content || "",
      usage: data.usage,
    };
  }
}
