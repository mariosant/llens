import { test, expect } from "bun:test";
import { loadConfig, mergeConfigs, getDefaultConfig } from "./config";
import type { RuntimeConfig, ConfigFile, TestConfig } from "../types";

test("getDefaultConfig should return sensible defaults", () => {
  const config = getDefaultConfig();
  expect(config.model).toBe("gpt-4");
  expect(config.temperature).toBe(0.7);
  expect(config.timeout).toBe(30000);
  expect(config.apiKey).toBe("");
  expect(config.baseUrl).toBe("https://api.openai.com/v1");
});

test("mergeConfigs should use defaults when no overrides", () => {
  const defaults = getDefaultConfig();
  const merged = mergeConfigs(defaults, {});
  expect(merged.model).toBe("gpt-4");
  expect(merged.temperature).toBe(0.7);
});

test("mergeConfigs should override with file config", () => {
  const defaults = getDefaultConfig();
  const fileConfig: ConfigFile = {
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  };
  const merged = mergeConfigs(defaults, fileConfig);
  expect(merged.model).toBe("gpt-3.5-turbo");
  expect(merged.temperature).toBe(0.5);
  expect(merged.timeout).toBe(30000); // unchanged
});

test("mergeConfigs should override with test config", () => {
  const base = getDefaultConfig();
  const testConfig: TestConfig = {
    model: "gpt-4-turbo",
    temperature: 0.9,
    timeout: 60000,
  };
  const merged = mergeConfigs(base, {}, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.9);
  expect(merged.timeout).toBe(60000);
});

test("mergeConfigs should prioritize test config over file config", () => {
  const defaults = getDefaultConfig();
  const fileConfig: ConfigFile = {
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  };
  const testConfig: TestConfig = {
    model: "gpt-4-turbo",
  };
  const merged = mergeConfigs(defaults, fileConfig, testConfig);
  expect(merged.model).toBe("gpt-4-turbo");
  expect(merged.temperature).toBe(0.5); // from file config
});

test("mergeConfigs should handle CLI overrides", () => {
  const defaults = getDefaultConfig();
  const cliOverrides = {
    model: "gpt-4o",
    apiKey: "sk-test-key",
  };
  const merged = mergeConfigs(defaults, {}, undefined, cliOverrides);
  expect(merged.model).toBe("gpt-4o");
  expect(merged.apiKey).toBe("sk-test-key");
});

test("mergeConfigs should prioritize CLI over everything", () => {
  const defaults = getDefaultConfig();
  const fileConfig: ConfigFile = { model: "gpt-3.5-turbo" };
  const testConfig: TestConfig = { model: "gpt-4-turbo" };
  const cliOverrides = { model: "gpt-4o" };
  const merged = mergeConfigs(defaults, fileConfig, testConfig, cliOverrides);
  expect(merged.model).toBe("gpt-4o");
});

test("loadConfig should return defaults when no config file exists", async () => {
  const config = await loadConfig("/nonexistent/path");
  expect(config.model).toBe("gpt-4");
  expect(config.temperature).toBe(0.7);
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
  
  const config = await loadConfig(tmpDir);
  expect(config.model).toBe("gpt-3.5-turbo");
  expect(config.temperature).toBe(0.5);
  expect(config.timeout).toBe(45000);
  
  // Cleanup
  await Bun.$`rm -rf ${tmpDir}`;
});

test("loadConfig should prefer environment variables", async () => {
  process.env.LLENS_MODEL = "env-model";
  process.env.LLENS_API_KEY = "env-api-key";
  process.env.LLENS_BASE_URL = "https://env.example.com";
  process.env.LLENS_TEMPERATURE = "0.3";
  process.env.LLENS_TIMEOUT = "60000";
  
  const config = await loadConfig("/nonexistent");
  expect(config.model).toBe("env-model");
  expect(config.apiKey).toBe("env-api-key");
  expect(config.baseUrl).toBe("https://env.example.com");
  expect(config.temperature).toBe(0.3);
  expect(config.timeout).toBe(60000);
  
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
  
  const config = await loadConfig(tmpDir);
  expect(config.model).toBe("env-model"); // from env
  expect(config.apiKey).toBe("file-key"); // from file
  
  // Cleanup
  delete process.env.LLENS_MODEL;
  await Bun.$`rm -rf ${tmpDir}`;
});
