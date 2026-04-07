import {
  parseYAML,
  parseJSON,
  parseTOML,
  parseJSON5,
} from "confbox";

export type Format = "yaml" | "json" | "toml" | "json5";

export function detectFormat(filename: string): Format | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".llens.yml") || lower.endsWith(".llens.yaml")) {
    return "yaml";
  }
  if (lower.endsWith(".llens.json")) {
    return "json";
  }
  if (lower.endsWith(".llens.toml")) {
    return "toml";
  }
  if (lower.endsWith(".llens.json5")) {
    return "json5";
  }
  return null;
}

export function parseFile(content: string, filename: string): unknown {
  const format = detectFormat(filename);
  
  if (!format) {
    throw new Error(`Unsupported file format: ${filename}`);
  }
  
  try {
    switch (format) {
      case "yaml":
        return parseYAML(content);
      case "json":
        return parseJSON(content);
      case "toml":
        return parseTOML(content);
      case "json5":
        return parseJSON5(content);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to parse ${filename}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
