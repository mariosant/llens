import {
  parseYAML,
  parseJSON,
  parseTOML,
  parseJSON5,
} from "confbox";
import { ok, err, trySync, type Result } from "./result";
import type { ParseError } from "../types";

export type Format = "yaml" | "json" | "toml" | "json5";

// Format detection using lookup object instead of conditionals
const formatPatterns: Record<string, Format> = {
  ".llens.yml": "yaml",
  ".llens.yaml": "yaml",
  ".llens.json": "json",
  ".llens.toml": "toml",
  ".llens.json5": "json5",
};

export const detectFormat = (filename: string): Format | null => {
  const lower = filename.toLowerCase();
  const pattern = Object.keys(formatPatterns).find((ext) => lower.endsWith(ext));
  return pattern ? (formatPatterns[pattern] ?? null) : null;
};

// Parser lookup - functional dispatch instead of switch
const parsers: Record<Format, (content: string) => unknown> = {
  yaml: parseYAML,
  json: parseJSON,
  toml: parseTOML,
  json5: parseJSON5,
};

export const parseFile = (content: string, filename: string): Result<unknown, ParseError> => {
  const format = detectFormat(filename);
  
  if (!format) {
    return err({
      kind: "parse_error",
      message: `Unsupported file format: ${filename}`,
      filePath: filename,
    });
  }
  
  const parse = parsers[format];
  const result = trySync(() => parse(content));
  
  return result.kind === "ok" 
    ? result 
    : err({
        kind: "parse_error",
        message: `Failed to parse ${filename}: ${result.error.message}`,
        filePath: filename,
      });
};

// Type-safe parse with schema validation helper
export const parseFileWithSchema = <T>(
  content: string, 
  filename: string,
  validate: (data: unknown) => T
): Result<T, ParseError> => {
  const parsed = parseFile(content, filename);
  
  if (parsed.kind === "err") return parsed;
  
  const validated = trySync(() => validate(parsed.value));
  
  return validated.kind === "ok"
    ? validated
    : err({
        kind: "parse_error",
        message: `Validation failed: ${validated.error.message}`,
        filePath: filename,
      });
};
