import { test, expect } from "bun:test";
import { parseFile, detectFormat } from "./parser";
import { isOk, isErr } from "./result";
import type { TestFile } from "../types";

test("detectFormat should identify YAML files", () => {
  expect(detectFormat("test.llens.yml")).toBe("yaml");
  expect(detectFormat("test.llens.yaml")).toBe("yaml");
  expect(detectFormat("/path/to/test.llens.yml")).toBe("yaml");
});

test("detectFormat should identify JSON files", () => {
  expect(detectFormat("test.llens.json")).toBe("json");
  expect(detectFormat("/path/to/test.llens.json")).toBe("json");
});

test("detectFormat should identify TOML files", () => {
  expect(detectFormat("test.llens.toml")).toBe("toml");
  expect(detectFormat("/path/to/test.llens.toml")).toBe("toml");
});

test("detectFormat should identify JSON5 files", () => {
  expect(detectFormat("test.llens.json5")).toBe("json5");
  expect(detectFormat("/path/to/test.llens.json5")).toBe("json5");
});

test("detectFormat should return null for unknown extensions", () => {
  expect(detectFormat("test.llens.txt")).toBeNull();
  expect(detectFormat("test.txt")).toBeNull();
  expect(detectFormat("test")).toBeNull();
});

test("parseFile should parse valid YAML content", () => {
  const yaml = `
name: Test Suite
config:
  model: gpt-4
  temperature: 0.7
tests:
  - name: Test 1
    query: Hello
    expect:
      - type: contains
        value: world
`;
  const result = parseFile(yaml, "test.llens.yml");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const testFile = result.value as TestFile;
    expect(testFile.name).toBe("Test Suite");
    expect(testFile.config?.model).toBe("gpt-4");
    expect(testFile.tests).toHaveLength(1);
    const firstTest = testFile.tests[0];
    expect(firstTest?.name).toBe("Test 1");
    expect(firstTest?.query).toBe("Hello");
  }
});

test("parseFile should parse valid JSON content", () => {
  const json = JSON.stringify({
    name: "Test Suite",
    tests: [
      {
        name: "Test 1",
        query: "Hello",
        expect: [{ type: "contains", value: "world" }],
      },
    ],
  });
  const result = parseFile(json, "test.llens.json");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const testFile = result.value as TestFile;
    expect(testFile.name).toBe("Test Suite");
    expect(testFile.tests).toHaveLength(1);
  }
});

test("parseFile should parse valid TOML content", () => {
  const toml = `
name = "Test Suite"

[[tests]]
name = "Test 1"
query = "Hello"

[[tests.expect]]
type = "contains"
value = "world"
`;
  const result = parseFile(toml, "test.llens.toml");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const testFile = result.value as TestFile;
    expect(testFile.name).toBe("Test Suite");
    expect(testFile.tests).toHaveLength(1);
    const firstTest = testFile.tests[0];
    expect(firstTest?.name).toBe("Test 1");
  }
});

test("parseFile should return err on invalid format", () => {
  const result = parseFile("content", "test.llens.txt");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toContain("Unsupported file format");
  }
});

test("parseFile should return err on invalid YAML", () => {
  const invalidYaml = "invalid: yaml: content: [";
  const result = parseFile(invalidYaml, "test.llens.yml");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toContain("Failed to parse");
  }
});

test("parseFile should return err on invalid JSON", () => {
  const invalidJson = "{ invalid json }";
  const result = parseFile(invalidJson, "test.llens.json");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toContain("Failed to parse");
  }
});

test("parseFile should handle empty tests array", () => {
  const yaml = `
name: Empty Test Suite
tests: []
`;
  const result = parseFile(yaml, "test.llens.yml");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const testFile = result.value as TestFile;
    expect(testFile.name).toBe("Empty Test Suite");
    expect(testFile.tests).toHaveLength(0);
  }
});

test("parseFile should parse all assertion types", () => {
  const yaml = `
tests:
  - name: All Assertions
    query: Test
    expect:
      - type: contains
        value: test
      - type: matches
        pattern: "/test/i"
      - type: json
      - type: schema
        schema:
          type: object
      - type: cost
        maxTokens: 100
      - type: latency
        maxMs: 5000
`;
  const result = parseFile(yaml, "test.llens.yml");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const testFile = result.value as TestFile;
    const firstTest = testFile.tests[0];
    expect(firstTest?.expect).toHaveLength(6);
    expect(firstTest?.expect[0]?.type).toBe("contains");
    expect(firstTest?.expect[1]?.type).toBe("matches");
    expect(firstTest?.expect[2]?.type).toBe("json");
    expect(firstTest?.expect[3]?.type).toBe("schema");
    expect(firstTest?.expect[4]?.type).toBe("cost");
    expect(firstTest?.expect[5]?.type).toBe("latency");
  }
});
