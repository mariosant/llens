import { parseFile, detectFormat } from "../utils/parser";
import { parseYAML, parseJSON, parseTOML } from "confbox";
import type { RuntimeConfig, ConfigFile, TestConfig } from "../types";

const DEFAULT_CONFIG: RuntimeConfig = {
  model: "gpt-4",
  temperature: 0.7,
  timeout: 30000,
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
};

export function getDefaultConfig(): RuntimeConfig {
  return { ...DEFAULT_CONFIG };
}

export function mergeConfigs(
  defaults: RuntimeConfig,
  fileConfig?: ConfigFile,
  testConfig?: TestConfig,
  cliOverrides?: Partial<RuntimeConfig>
): RuntimeConfig {
  let merged: RuntimeConfig = { ...defaults };

  // Apply file config
  if (fileConfig) {
    if (fileConfig.model !== undefined) merged.model = fileConfig.model;
    if (fileConfig.temperature !== undefined)
      merged.temperature = fileConfig.temperature;
    if (fileConfig.timeout !== undefined) merged.timeout = fileConfig.timeout;
    if (fileConfig.apiKey !== undefined) merged.apiKey = fileConfig.apiKey;
    if (fileConfig.baseUrl !== undefined) merged.baseUrl = fileConfig.baseUrl;
  }

  // Apply test config
  if (testConfig) {
    if (testConfig.model !== undefined) merged.model = testConfig.model;
    if (testConfig.temperature !== undefined)
      merged.temperature = testConfig.temperature;
    if (testConfig.timeout !== undefined) merged.timeout = testConfig.timeout;
    if (testConfig.response_format !== undefined)
      merged.response_format = testConfig.response_format;
  }

  // Apply CLI overrides (highest priority)
  if (cliOverrides) {
    if (cliOverrides.model !== undefined) merged.model = cliOverrides.model;
    if (cliOverrides.temperature !== undefined)
      merged.temperature = cliOverrides.temperature;
    if (cliOverrides.timeout !== undefined) merged.timeout = cliOverrides.timeout;
    if (cliOverrides.apiKey !== undefined) merged.apiKey = cliOverrides.apiKey;
    if (cliOverrides.baseUrl !== undefined) merged.baseUrl = cliOverrides.baseUrl;
    if (cliOverrides.response_format !== undefined)
      merged.response_format = cliOverrides.response_format;
  }

  return merged;
}

async function loadConfigFile(dir: string): Promise<ConfigFile | null> {
  const configFiles = [
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

  for (const { name, format } of configFiles) {
    const path = `${dir}/${name}`;
    const file = Bun.file(path);
    if (await file.exists()) {
      const content = await file.text();
      try {
        switch (format) {
          case "yaml":
            return parseYAML(content) as ConfigFile;
          case "json":
            return parseJSON(content) as ConfigFile;
          case "toml":
            return parseTOML(content) as ConfigFile;
        }
      } catch (error) {
        throw new Error(
          `Failed to parse ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  return null;
}

function loadFromEnv(): Partial<RuntimeConfig> {
  const env: Partial<RuntimeConfig> = {};

  if (process.env.LLENS_MODEL) env.model = process.env.LLENS_MODEL;
  if (process.env.LLENS_API_KEY) env.apiKey = process.env.LLENS_API_KEY;
  if (process.env.LLENS_BASE_URL) env.baseUrl = process.env.LLENS_BASE_URL;
  if (process.env.LLENS_TEMPERATURE)
    env.temperature = parseFloat(process.env.LLENS_TEMPERATURE);
  if (process.env.LLENS_TIMEOUT)
    env.timeout = parseInt(process.env.LLENS_TIMEOUT, 10);

  return env;
}

export async function loadConfig(
  cwd: string,
  cliOverrides?: Partial<RuntimeConfig>
): Promise<RuntimeConfig> {
  const defaults = getDefaultConfig();
  const fileConfig = await loadConfigFile(cwd);
  const envConfig = loadFromEnv();

  // Merge: defaults -> file -> env -> CLI
  let config = mergeConfigs(defaults, fileConfig ?? undefined);
  config = mergeConfigs(config, undefined, undefined, envConfig);
  config = mergeConfigs(config, undefined, undefined, cliOverrides);

  return config;
}
