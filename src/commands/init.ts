import { defineCommand } from "citty";

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
    const filename = args.name.endsWith(".llens.yml") 
      ? args.name 
      : `${args.name}.llens.yml`;
    
    const file = Bun.file(filename);
    if (await file.exists()) {
      console.error(`File ${filename} already exists.`);
      process.exit(1);
    }
    
    await Bun.write(filename, SAMPLE_TEST);
    console.log(`Created ${filename}`);
    console.log();
    console.log("Run tests with:");
    console.log(`  llens ${filename}`);
  },
});
