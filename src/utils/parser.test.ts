import { test, expect } from "bun:test";
import { parseFile, detectFormat } from "./parser";
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
  const result = parseFile(yaml, "test.llens.yml") as TestFile;
  expect(result.name).toBe("Test Suite");
  expect(result.config?.model).toBe("gpt-4");
  expect(result.tests).toHaveLength(1);
  expect(result.tests[0].name).toBe("Test 1");
  expect(result.tests[0].query).toBe("Hello");
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
  const result = parseFile(json, "test.llens.json") as TestFile;
  expect(result.name).toBe("Test Suite");
  expect(result.tests).toHaveLength(1);
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
  const result = parseFile(toml, "test.llens.toml") as TestFile;
  expect(result.name).toBe("Test Suite");
  expect(result.tests).toHaveLength(1);
  expect(result.tests[0].name).toBe("Test 1");
});

test("parseFile should throw on invalid format", () => {
  expect(() => parseFile("content", "test.llens.txt")).toThrow();
});

test("parseFile should throw on invalid YAML", () => {
  const invalidYaml = "invalid: yaml: content: [";
  expect(() => parseFile(invalidYaml, "test.llens.yml")).toThrow();
});

test("parseFile should throw on invalid JSON", () => {
  const invalidJson = "{ invalid json }";
  expect(() => parseFile(invalidJson, "test.llens.json")).toThrow();
});

test("parseFile should handle empty tests array", () => {
  const yaml = `
name: Empty Test Suite
tests: []
`;
  const result = parseFile(yaml, "test.llens.yml") as TestFile;
  expect(result.name).toBe("Empty Test Suite");
  expect(result.tests).toHaveLength(0);
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
  const result = parseFile(yaml, "test.llens.yml") as TestFile;
  expect(result.tests[0].expect).toHaveLength(6);
  expect(result.tests[0].expect[0].type).toBe("contains");
  expect(result.tests[0].expect[1].type).toBe("matches");
  expect(result.tests[0].expect[2].type).toBe("json");
  expect(result.tests[0].expect[3].type).toBe("schema");
  expect(result.tests[0].expect[4].type).toBe("cost");
  expect(result.tests[0].expect[5].type).toBe("latency");
});
