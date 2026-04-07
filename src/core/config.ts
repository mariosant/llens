import { parseYAML, parseJSON, parseTOML } from "confbox";
import { ok, err, tryAsync, trySync, unwrapOr, type Result } from "../utils/result";
import { mapArray, findArray, reduceArray } from "../utils/functional";
import type { RuntimeConfig, ConfigFile, TestConfig, ConfigError } from "../types";

// Default configuration (immutable)
export const DEFAULT_CONFIG: RuntimeConfig = {
  model: "gpt-4",
  temperature: 0.7,
  timeout: 30000,
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
};

// Config file search paths with formats
const CONFIG_FILES: readonly { readonly name: string; readonly format: "yaml" | "json" | "toml" }[] = [
  { name: ".llensrc", format: "yaml" },
  { name: ".llensrc.yml", format: "yaml" },
  { name: ".llensrc.yaml", format: "yaml" },
  { name: ".llensrc.json", format: "json" },
  { name: ".llensrc.toml", format: "toml" },
  { name: "llens.config.yml", format: "yaml" },
  { name: "llens.config.yaml", format: "yaml" },
  { name: "llens.config.json", format: "json" },
  { name: "llens.config.toml", format: "toml" },
];

// Parser lookup
const PARSERS = {
  yaml: parseYAML,
  json: parseJSON,
  toml: parseTOML,
};

// Single config file loader
const loadConfigFile = async (
  dir: string,
  configFile: { name: string; format: keyof typeof PARSERS }
): Promise<Result<ConfigFile | null, ConfigError>> => {
  const path = `${dir}/${configFile.name}`;
  const file = Bun.file(path);
  const exists = await file.exists();
  
  if (!exists) return ok(null);
  
  const content = await file.text();
  const parse = PARSERS[configFile.format];
  const result = trySync(() => parse(content) as ConfigFile);
  
  return result.kind === "ok"
    ? ok(result.value)
    : err({ kind: "config_error", message: `Failed to parse ${configFile.name}: ${result.error.message}` });
};

// Find and load first existing config file
export const findConfigFile = async (dir: string): Promise<Result<ConfigFile | null, ConfigError>> => {
  const tryLoad = async (
    index: number
  ): Promise<Result<ConfigFile | null, ConfigError>> => {
    if (index >= CONFIG_FILES.length) return ok(null);
    
    const result = await loadConfigFile(dir, CONFIG_FILES[index]!);
    
    if (result.kind === "err") return result;
    if (result.value !== null) return ok(result.value);
    
    return tryLoad(index + 1);
  };
  
  return tryLoad(0);
};

// Environment variable config loader
const ENV_MAPPINGS: readonly { readonly env: string; readonly key: keyof RuntimeConfig; readonly transform?: (v: string) => string | number }[] = [
  { env: "LLENS_MODEL", key: "model" },
  { env: "LLENS_API_KEY", key: "apiKey" },
  { env: "LLENS_BASE_URL", key: "baseUrl" },
  { env: "LLENS_TEMPERATURE", key: "temperature", transform: parseFloat },
  { env: "LLENS_TIMEOUT", key: "timeout", transform: (v) => parseInt(v, 10) },
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
    (merged, config) =>
      config ? { ...merged, ...config } : merged,
    DEFAULT_CONFIG
  );

// Main config loader
export const loadConfig = async (
  cwd: string,
  cliOverrides?: Partial<RuntimeConfig>
): Promise<Result<RuntimeConfig, ConfigError>> => {
  const fileResult = await findConfigFile(cwd);
  
  if (fileResult.kind === "err") return fileResult;
  
  const fileConfig = fileResult.value ?? undefined;
  const envConfig = loadFromEnv();
  
  // Merge: defaults -> file -> env -> cli
  const config = mergeConfigs(
    DEFAULT_CONFIG,
    fileConfig,
    envConfig,
    cliOverrides
  );
  
  return ok(config);
};

// Test-specific config merger
export const mergeTestConfig = (
  baseConfig: RuntimeConfig,
  testConfig?: TestConfig
): RuntimeConfig =>
  testConfig
    ? {
        ...baseConfig,
        ...(testConfig.model && { model: testConfig.model }),
        ...(testConfig.temperature !== undefined && { temperature: testConfig.temperature }),
        ...(testConfig.timeout !== undefined && { timeout: testConfig.timeout }),
        ...(testConfig.response_format && { response_format: testConfig.response_format }),
      }
    : baseConfig;
