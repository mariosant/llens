import { loadConfig as loadC12Config } from "c12";
import { ok, err, type Result } from "../utils/result";
import type {
  RuntimeConfig,
  TestConfig,
  ConfigError,
  LLMProvider,
  ProviderAPIKeys,
} from "../types";

const DEFAULT_PROVIDER: LLMProvider = "openai";

export const DEFAULT_CONFIG: RuntimeConfig = {
  provider: DEFAULT_PROVIDER,
  model: "gpt-4",
  temperature: 0.7,
  timeout: 30000,
  apiKeys: {},
  failFast: false,
};

const ENV_MAPPINGS: readonly {
  readonly env: string;
  readonly key: keyof RuntimeConfig | "apiKeys";
  readonly transform?: (v: string) => string | number | boolean | LLMProvider;
}[] = [
  {
    env: "LLENS_PROVIDER",
    key: "provider",
    transform: (v) => v as LLMProvider,
  },
  { env: "LLENS_MODEL", key: "model" },
  { env: "LLENS_TEMPERATURE", key: "temperature", transform: parseFloat },
  { env: "LLENS_TIMEOUT", key: "timeout", transform: (v) => parseInt(v, 10) },
  { env: "LLENS_FAIL_FAST", key: "failFast", transform: (v) => v === "true" },
];

const loadProviderAPIKeys = (): ProviderAPIKeys => ({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
});

export const loadFromEnv = (): Partial<RuntimeConfig> => {
  const config = ENV_MAPPINGS.reduce((acc, { env, key, transform }) => {
    const value = process.env[env];
    if (value === undefined) return acc;
    return { ...acc, [key]: transform ? transform(value) : value };
  }, {} as Partial<RuntimeConfig>);

  const apiKeys = loadProviderAPIKeys();
  const hasAnyApiKey = apiKeys.openai || apiKeys.anthropic || apiKeys.google;

  if (hasAnyApiKey) {
    return { ...config, apiKeys };
  }

  return config;
};

export const mergeConfigs = (
  ...configs: ReadonlyArray<Partial<RuntimeConfig> | undefined>
): RuntimeConfig =>
  configs.reduce<RuntimeConfig>(
    (merged, config) => (config ? { ...merged, ...config } : merged),
    DEFAULT_CONFIG,
  );

export const loadConfig = async (
  cwd: string,
  cliOverrides?: Partial<RuntimeConfig>,
): Promise<Result<RuntimeConfig, ConfigError>> => {
  try {
    const result = await loadC12Config({
      cwd,
      name: "llens",
      defaults: {},
      overrides: {},
    });

    const c12Config = result.config as Partial<RuntimeConfig>;
    const envConfig = loadFromEnv();

    const fileDefaults = c12Config as {
      defaults?: {
        provider?: LLMProvider;
        model?: string;
        temperature?: number;
        timeout?: number;
      };
      providers?: {
        openai?: { apiKey?: string };
        anthropic?: { apiKey?: string };
        google?: { apiKey?: string };
      };
      failFast?: boolean;
    };

    const resolvedProvider =
      cliOverrides?.provider ??
      envConfig.provider ??
      fileDefaults.defaults?.provider ??
      DEFAULT_PROVIDER;

    const resolvedModel =
      cliOverrides?.model ??
      envConfig.model ??
      fileDefaults.defaults?.model ??
      DEFAULT_CONFIG.model;

    const fileAPIKeys: ProviderAPIKeys = {
      openai: fileDefaults.providers?.openai?.apiKey,
      anthropic: fileDefaults.providers?.anthropic?.apiKey,
      google: fileDefaults.providers?.google?.apiKey,
    };

    const mergedAPIKeys: ProviderAPIKeys = {
      ...fileAPIKeys,
      ...envConfig.apiKeys,
    };

    const config: RuntimeConfig = {
      provider: resolvedProvider,
      model: resolvedModel,
      temperature:
        cliOverrides?.temperature ??
        envConfig.temperature ??
        fileDefaults.defaults?.temperature ??
        DEFAULT_CONFIG.temperature,
      timeout:
        cliOverrides?.timeout ??
        envConfig.timeout ??
        fileDefaults.defaults?.timeout ??
        DEFAULT_CONFIG.timeout,
      apiKeys: mergedAPIKeys,
      failFast:
        cliOverrides?.failFast ??
        fileDefaults.failFast ??
        DEFAULT_CONFIG.failFast,
    };

    return ok(config);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown configuration error";
    return err({ kind: "config_error", message });
  }
};

export const mergeTestConfig = (
  baseConfig: RuntimeConfig,
  testConfig?: TestConfig,
): RuntimeConfig =>
  testConfig
    ? {
        ...baseConfig,
        ...(testConfig.provider && { provider: testConfig.provider }),
        ...(testConfig.model && { model: testConfig.model }),
        ...(testConfig.temperature !== undefined && {
          temperature: testConfig.temperature,
        }),
        ...(testConfig.timeout !== undefined && {
          timeout: testConfig.timeout,
        }),
      }
    : baseConfig;

export const getProviderAPIKey = (
  config: RuntimeConfig,
  provider?: LLMProvider,
): string | undefined => {
  const p = provider ?? config.provider;
  return config.apiKeys[p];
};
