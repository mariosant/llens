import { loadConfig as loadC12Config } from "c12";
import { ok, err, type Result } from "../utils/result";
import type { RuntimeConfig, TestConfig, ConfigError } from "../types";

// Default configuration (immutable)
export const DEFAULT_CONFIG: RuntimeConfig = {
  model: "gpt-4",
  temperature: 0.7,
  timeout: 30000,
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  failFast: false,
};

// Environment variable config loader
const ENV_MAPPINGS: readonly {
  readonly env: string;
  readonly key: keyof RuntimeConfig;
  readonly transform?: (v: string) => string | number | boolean;
}[] = [
  { env: "LLENS_MODEL", key: "model" },
  { env: "LLENS_API_KEY", key: "apiKey" },
  { env: "LLENS_BASE_URL", key: "baseUrl" },
  { env: "LLENS_TEMPERATURE", key: "temperature", transform: parseFloat },
  { env: "LLENS_TIMEOUT", key: "timeout", transform: (v) => parseInt(v, 10) },
  { env: "LLENS_FAIL_FAST", key: "failFast", transform: (v) => v === "true" },
];

export const loadFromEnv = (): Partial<RuntimeConfig> =>
  ENV_MAPPINGS.reduce((acc, { env, key, transform }) => {
    const value = process.env[env];
    return value !== undefined
      ? { ...acc, [key]: transform ? transform(value) : value }
      : acc;
  }, {} as Partial<RuntimeConfig>);

// Config merger - rightmost values take precedence
export const mergeConfigs = (
  ...configs: ReadonlyArray<Partial<RuntimeConfig> | undefined>
): RuntimeConfig =>
  configs.reduce<RuntimeConfig>(
    (merged, config) => (config ? { ...merged, ...config } : merged),
    DEFAULT_CONFIG,
  );

// Main config loader using c12
export const loadConfig = async (
  cwd: string,
  cliOverrides?: Partial<RuntimeConfig>,
): Promise<Result<RuntimeConfig, ConfigError>> => {
  try {
    // Load config using c12 with defaults
    const result = await loadC12Config({
      cwd,
      name: "llens",
      defaults: DEFAULT_CONFIG,
      overrides: cliOverrides,
    });

    // Extract config from c12 result
    const c12Config = result.config as Partial<RuntimeConfig>;

    // Load environment variables (they have higher priority than config file)
    const envConfig = loadFromEnv();

    // Merge: c12 config -> env -> cli overrides
    const config = mergeConfigs(c12Config, envConfig, cliOverrides);

    return ok(config);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown configuration error";
    return err({ kind: "config_error", message });
  }
};

// Test-specific config merger
export const mergeTestConfig = (
  baseConfig: RuntimeConfig,
  testConfig?: TestConfig,
): RuntimeConfig =>
  testConfig
    ? {
        ...baseConfig,
        ...(testConfig.model && { model: testConfig.model }),
        ...(testConfig.temperature !== undefined && {
          temperature: testConfig.temperature,
        }),
        ...(testConfig.timeout !== undefined && {
          timeout: testConfig.timeout,
        }),
        ...(testConfig.response_format && {
          response_format: testConfig.response_format,
        }),
      }
    : baseConfig;
