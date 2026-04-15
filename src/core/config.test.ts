import { test, expect, beforeEach, afterEach } from "bun:test";
import {
  loadConfig,
  loadFromEnv,
  mergeConfigs,
  mergeTestConfig,
  DEFAULT_CONFIG,
} from "./config";
import type { RuntimeConfig, ConfigFile, TestConfig } from "../types";
import { isOk } from "../utils/result";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.LLENS_MODEL;
  delete process.env.LLENS_PROVIDER;
  delete process.env.LLENS_TEMPERATURE;
  delete process.env.LLENS_TIMEOUT;
  delete process.env.LLENS_FAIL_FAST;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_API_KEY;
});

afterEach(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

test("DEFAULT_CONFIG should return sensible defaults", () => {
  expect(DEFAULT_CONFIG.provider).toBe("openai");
  expect(DEFAULT_CONFIG.model).toBe("gpt-4");
  expect(DEFAULT_CONFIG.temperature).toBe(0.7);
  expect(DEFAULT_CONFIG.timeout).toBe(30000);
  expect(DEFAULT_CONFIG.apiKeys).toEqual({});
});

test("mergeConfigs should use defaults when no overrides", () => {
  const merged = mergeConfigs(DEFAULT_CONFIG, {});
  expect(merged.provider).toBe("openai");
  expect(merged.model).toBe("gpt-4");
  expect(merged.temperature).toBe(0.7);
});

test("mergeConfigs should override with file config", () => {
  const fileConfig: Partial<RuntimeConfig> = {
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    temperature: 0.5,
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig);
  expect(merged.provider).toBe("anthropic");
  expect(merged.model).toBe("claude-3-5-sonnet-latest");
  expect(merged.temperature).toBe(0.5);
  expect(merged.timeout).toBe(30000);
});

test("mergeConfigs should override with test config", () => {
  const testConfig: Partial<RuntimeConfig> = {
    model: "gpt-4-turbo",
    temperature: 0.9,
    timeout: 60000,
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, {}, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.9);
  expect(merged.timeout).toBe(60000);
});

test("mergeConfigs should prioritize later configs over earlier", () => {
  const fileConfig: Partial<RuntimeConfig> = {
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  };
  const testConfig: Partial<RuntimeConfig> = {
    model: "gpt-4-turbo",
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.5);
});

test("mergeConfigs should handle CLI overrides", () => {
  const cliOverrides = {
    provider: "anthropic" as const,
    model: "claude-3-opus",
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, {}, {}, cliOverrides);
  expect(merged.provider).toBe("anthropic");
  expect(merged.model).toBe("claude-3-opus");
});

test("mergeConfigs should prioritize CLI over everything", () => {
  const fileConfig: Partial<RuntimeConfig> = {
    provider: "openai",
    model: "gpt-3.5-turbo",
  };
  const testConfig: Partial<RuntimeConfig> = {
    model: "gpt-4-turbo",
  };
  const cliOverrides = { model: "gpt-4o" };
  const merged = mergeConfigs(
    DEFAULT_CONFIG,
    fileConfig,
    testConfig,
    cliOverrides,
  );
  expect(merged.model).toBe("gpt-4o");
});

test("loadConfig should return defaults when no config file exists", async () => {
  const configResult = await loadConfig("/nonexistent/path");
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.provider).toBe("openai");
    expect(configResult.value.model).toBe("gpt-4");
    expect(configResult.value.temperature).toBe(0.7);
  }
});

test("loadConfig should load from llens.config.yml with nested structure", async () => {
  const tmpDir = "/tmp/llens-test-config";
  await Bun.$`mkdir -p ${tmpDir}`;
  const configContent = `
defaults:
  provider: anthropic
  model: claude-3-5-sonnet-latest
  temperature: 0.5
  timeout: 45000
`;
  await Bun.write(`${tmpDir}/llens.config.yml`, configContent);

  const configResult = await loadConfig(tmpDir);
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.provider).toBe("anthropic");
    expect(configResult.value.model).toBe("claude-3-5-sonnet-latest");
    expect(configResult.value.temperature).toBe(0.5);
    expect(configResult.value.timeout).toBe(45000);
  }

  await Bun.$`rm -rf ${tmpDir}`;
});

test("loadConfig should prefer environment variables over file config", async () => {
  const tmpDir = "/tmp/llens-test-env";
  await Bun.$`mkdir -p ${tmpDir}`;
  await Bun.write(
    `${tmpDir}/llens.config.yml`,
    "defaults:\n  model: file-model\n  provider: openai",
  );

  process.env.LLENS_MODEL = "env-model";
  process.env.LLENS_PROVIDER = "anthropic";

  const configResult = await loadConfig(tmpDir);
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.model).toBe("env-model");
    expect(configResult.value.provider).toBe("anthropic");
  }

  await Bun.$`rm -rf ${tmpDir}`;
});

test("loadConfig should load provider API keys from env vars", async () => {
  process.env.OPENAI_API_KEY = "sk-openai-test";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";

  const configResult = await loadConfig("/nonexistent");
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.apiKeys.openai).toBe("sk-openai-test");
    expect(configResult.value.apiKeys.anthropic).toBe("sk-ant-test");
  }
});

test("loadConfig should load provider API keys from config file", async () => {
  const tmpDir = "/tmp/llens-test-providers";
  await Bun.$`mkdir -p ${tmpDir}`;
  await Bun.write(
    `${tmpDir}/llens.config.yml`,
    `
defaults:
  provider: openai
providers:
  openai:
    apiKey: file-openai-key
  anthropic:
    apiKey: file-ant-key
`,
  );

  const configResult = await loadConfig(tmpDir);
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.apiKeys.openai).toBe("file-openai-key");
    expect(configResult.value.apiKeys.anthropic).toBe("file-ant-key");
  }

  await Bun.$`rm -rf ${tmpDir}`;
});

test("mergeTestConfig should merge test-specific config", () => {
  const base: RuntimeConfig = {
    ...DEFAULT_CONFIG,
    provider: "openai",
    apiKeys: { openai: "test-key" },
  };
  const testConfig: TestConfig = {
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    temperature: 0.9,
    timeout: 60000,
  };
  const merged = mergeTestConfig(base, testConfig);
  expect(merged.provider).toBe("anthropic");
  expect(merged.model).toBe("claude-3-5-sonnet-latest");
  expect(merged.temperature).toBe(0.9);
  expect(merged.timeout).toBe(60000);
});

test("mergeTestConfig should return base config when no testConfig", () => {
  const base: RuntimeConfig = {
    ...DEFAULT_CONFIG,
    apiKeys: {},
  };
  const merged = mergeTestConfig(base, undefined);
  expect(merged).toBe(base);
});

test("mergeTestConfig should only override provider if specified", () => {
  const base: RuntimeConfig = {
    ...DEFAULT_CONFIG,
    provider: "openai",
    apiKeys: { openai: "test-key" },
  };
  const testConfig: TestConfig = {
    model: "gpt-4-turbo",
  };
  const merged = mergeTestConfig(base, testConfig);
  expect(merged.provider).toBe("openai");
  expect(merged.model).toBe("gpt-4-turbo");
});
