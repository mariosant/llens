import { test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, loadFromEnv, mergeConfigs, mergeTestConfig, findConfigFile, DEFAULT_CONFIG } from "./config";
import type { RuntimeConfig, ConfigFile, TestConfig } from "../types";
import { isOk, unwrapOr } from "../utils/result";

// Save original env
const ORIGINAL_ENV = { ...process.env };

// Clear llens-specific env vars before each test
beforeEach(() => {
  delete process.env.LLENS_MODEL;
  delete process.env.LLENS_API_KEY;
  delete process.env.LLENS_BASE_URL;
  delete process.env.LLENS_TEMPERATURE;
  delete process.env.LLENS_TIMEOUT;
});

// Restore original env after each test
afterEach(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

test("DEFAULT_CONFIG should return sensible defaults", () => {
  expect(DEFAULT_CONFIG.model).toBe("gpt-4");
  expect(DEFAULT_CONFIG.temperature).toBe(0.7);
  expect(DEFAULT_CONFIG.timeout).toBe(30000);
  expect(DEFAULT_CONFIG.apiKey).toBe("");
  expect(DEFAULT_CONFIG.baseUrl).toBe("https://api.openai.com/v1");
});

test("mergeConfigs should use defaults when no overrides", () => {
  const merged = mergeConfigs(DEFAULT_CONFIG, {});
  expect(merged.model).toBe("gpt-4");
  expect(merged.temperature).toBe(0.7);
});

test("mergeConfigs should override with file config", () => {
  const fileConfig: ConfigFile = {
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig);
  expect(merged.model).toBe("gpt-3.5-turbo");
  expect(merged.temperature).toBe(0.5);
  expect(merged.timeout).toBe(30000); // unchanged
});

test("mergeConfigs should override with test config", () => {
  const testConfig: TestConfig = {
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
  const fileConfig: ConfigFile = {
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  };
  const testConfig: TestConfig = {
    model: "gpt-4-turbo",
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.5); // from file config
});

test("mergeConfigs should handle CLI overrides", () => {
  const cliOverrides = {
    model: "gpt-4o",
    apiKey: "sk-test-key",
  };
  const merged = mergeConfigs(DEFAULT_CONFIG, {}, {}, cliOverrides);
  expect(merged.model).toBe("gpt-4o");
  expect(merged.apiKey).toBe("sk-test-key");
});

test("mergeConfigs should prioritize CLI over everything", () => {
  const fileConfig: ConfigFile = { model: "gpt-3.5-turbo" };
  const testConfig: TestConfig = { model: "gpt-4-turbo" };
  const cliOverrides = { model: "gpt-4o" };
  const merged = mergeConfigs(DEFAULT_CONFIG, fileConfig, testConfig, cliOverrides);
  expect(merged.model).toBe("gpt-4o");
});

test("loadConfig should return defaults when no config file exists", async () => {
  const configResult = await loadConfig("/nonexistent/path");
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.model).toBe("gpt-4");
    expect(configResult.value.temperature).toBe(0.7);
  }
});

test("loadConfig should load from .llensrc.yml", async () => {
  // Create a temporary config file
  const tmpDir = "/tmp/llens-test-config";
  await Bun.$`mkdir -p ${tmpDir}`;
  const configContent = `
model: gpt-3.5-turbo
temperature: 0.5
timeout: 45000
`;
  await Bun.write(`${tmpDir}/.llensrc.yml`, configContent);
  
  const configResult = await loadConfig(tmpDir);
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.model).toBe("gpt-3.5-turbo");
    expect(configResult.value.temperature).toBe(0.5);
    expect(configResult.value.timeout).toBe(45000);
  }
  
  // Cleanup
  await Bun.$`rm -rf ${tmpDir}`;
});

test("loadConfig should prefer environment variables", async () => {
  process.env.LLENS_MODEL = "env-model";
  process.env.LLENS_API_KEY = "env-api-key";
  process.env.LLENS_BASE_URL = "https://env.example.com";
  process.env.LLENS_TEMPERATURE = "0.3";
  process.env.LLENS_TIMEOUT = "60000";
  
  const configResult = await loadConfig("/nonexistent");
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.model).toBe("env-model");
    expect(configResult.value.apiKey).toBe("env-api-key");
    expect(configResult.value.baseUrl).toBe("https://env.example.com");
    expect(configResult.value.temperature).toBe(0.3);
    expect(configResult.value.timeout).toBe(60000);
  }
  
  // Cleanup
  delete process.env.LLENS_MODEL;
  delete process.env.LLENS_API_KEY;
  delete process.env.LLENS_BASE_URL;
  delete process.env.LLENS_TEMPERATURE;
  delete process.env.LLENS_TIMEOUT;
});

test("loadConfig environment variables override file config", async () => {
  const tmpDir = "/tmp/llens-test-env";
  await Bun.$`mkdir -p ${tmpDir}`;
  await Bun.write(`${tmpDir}/.llensrc.yml`, "model: file-model\napiKey: file-key");
  
  process.env.LLENS_MODEL = "env-model";
  
  const configResult = await loadConfig(tmpDir);
  expect(isOk(configResult)).toBe(true);
  if (isOk(configResult)) {
    expect(configResult.value.model).toBe("env-model"); // from env
    expect(configResult.value.apiKey).toBe("file-key"); // from file
  }
  
  // Cleanup
  delete process.env.LLENS_MODEL;
  await Bun.$`rm -rf ${tmpDir}`;
});

test("mergeTestConfig should merge test-specific config", () => {
  const base: RuntimeConfig = { ...DEFAULT_CONFIG };
  const testConfig: TestConfig = {
    model: "gpt-4-turbo",
    temperature: 0.9,
    timeout: 60000,
  };
  const merged = mergeTestConfig(base, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.9);
  expect(merged.timeout).toBe(60000);
  expect(merged.baseUrl).toBe(DEFAULT_CONFIG.baseUrl); // unchanged
});

test("mergeTestConfig should return base config when no testConfig", () => {
  const base: RuntimeConfig = { ...DEFAULT_CONFIG };
  const merged = mergeTestConfig(base, undefined);
  expect(merged).toBe(base);
});
