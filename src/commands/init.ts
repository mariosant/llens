import { defineCommand } from "citty";
import { ok, err, type Result } from "../utils/result";

const SAMPLE_TEST = `# LLM Quality Test Suite
name: "My First Test Suite"
config:
  model: gpt-4
  temperature: 0.7
  timeout: 30000

tests:
  - name: "Capital of France"
    query: "What is the capital of France?"
    expect:
      - type: contains
        value: "Paris"
      - type: matches
        pattern: "capital.*France"

  - name: "JSON Response Test"
    query: 'Return a JSON object with fields "name" and "age"'
    config:
      response_format:
        type: json_object
    expect:
      - type: json
      - type: schema
        schema:
          type: object
          properties:
            name:
              type: string
            age:
              type: number
          required:
            - name
            - age
`;

// Filename helper - adds extension if missing
const ensureExtension = (name: string): string =>
  name.endsWith(".llens.yml") ? name : `${name}.llens.yml`;

// File existence check
const checkFileExists = async (filename: string): Promise<boolean> => {
  const file = Bun.file(filename);
  return file.exists();
};

// Write file operation
const writeFile = async (filename: string, content: string): Promise<Result<void, Error>> => {
  try {
    await Bun.write(filename, content);
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

// Main init logic
const initTestFile = async (name: string): Promise<Result<void, string>> => {
  const filename = ensureExtension(name);
  
  const exists = await checkFileExists(filename);
  if (exists) {
    return err(`File ${filename} already exists.`);
  }
  
  const writeResult = await writeFile(filename, SAMPLE_TEST);
  
  return writeResult.kind === "ok"
    ? ok(undefined)
    : err(`Failed to create file: ${writeResult.error.message}`);
};

export default defineCommand({
  meta: {
    name: "init",
    description: "Create a sample test file",
  },
  args: {
    name: {
      type: "positional",
      description: "Name of the test file",
      default: "test",
    },
  },
  async run({ args }) {
    const result = await initTestFile(args.name);
    
    if (result.kind === "err") {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
    
    const filename = ensureExtension(args.name);
    console.log(`Created ${filename}`);
    console.log();
    console.log("Run tests with:");
    console.log(`  llens ${filename}`);
  },
});
