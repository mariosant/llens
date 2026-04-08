# AGENTS.md

## Project Overview

**llens** is an LLM Quality Assurance Test Runner built with [Bun](https://bun.sh/) and [Mocha](https://mochajs.org/). It allows you to:

- Write declarative test files in YAML/JSON/TOML/JSON5
- Test LLM responses against assertions (content, JSON, schema, cost, latency)
- Run tests against OpenAI-compatible APIs via a CLI tool
- Validate test file syntax without execution

The project is a CLI application with a modular architecture using TypeScript and Zod for runtime validation.

## Architecture

### Directory Structure

```
src/
├── cli.ts              # CLI entry point (citty-based)
├── commands/           # CLI subcommands
│   ├── init.ts         # Creates sample test files
│   ├── run.ts          # Runs test suites
│   └── validate.ts     # Validates test file syntax
├── core/               # Core testing logic
│   ├── assertions.ts   # Assertion evaluation engine
│   ├── config.ts       # Configuration loading & merging
│   ├── llm-client.ts   # OpenAI-compatible API client
│   └── runner.ts       # Test execution orchestrator (Mocha-based)
├── types/              # TypeScript types & Zod schemas
│   └── index.ts
└── utils/              # Utilities
    ├── glob.ts         # File globbing
    └── parser.ts       # Multi-format file parser
```

### Key Components

#### CLI (`src/cli.ts`)

Uses [citty](https://github.com/unjs/citty) for command-line interface. Three subcommands:

- `run` (default) - Execute test files
- `init` - Create sample test files
- `validate` - Check test file syntax

#### Configuration System (`src/core/config.ts`)

Uses [c12](https://github.com/unjs/c12) for smart configuration loading.

Config merging priority (highest to lowest):

1. CLI arguments
2. Environment variables
3. Config file (`llens.config.yml`, `.llensrc.yml`, etc.)
4. Default values

Key functions:

- `loadConfig(cwd, cliOverrides)` - Load and merge all config sources using c12
- `mergeConfigs()` - Merge multiple config levels
- `loadFromEnv()` - Load environment variables

#### Test Runner (`src/core/runner.ts`)

The runner uses Mocha's programmatic API to execute LLM tests:

- Merges config for each test
- Creates LLM client instances
- Runs tests via Mocha's battle-tested runner
- Uses Mocha reporters for output

#### LLM Client (`src/core/llm-client.ts`)

OpenAI-compatible API client:

- Sends chat completion requests
- Supports `response_format` for JSON mode
- Returns content + token usage

#### Assertions (`src/core/assertions.ts`)

Six assertion types supported:

| Assertion  | Description                          | Parameters           |
| ---------- | ------------------------------------ | -------------------- |
| `contains` | Check if response contains substring | `value: string`      |
| `matches`  | Regex pattern matching               | `pattern: string`    |
| `json`     | Validate response is valid JSON      | none                 |
| `schema`   | Validate JSON against Zod schema     | `schema: object`     |
| `cost`     | Check token usage limits             | `maxTokens?: number` |
| `latency`  | Check response time                  | `maxMs: number`      |

#### Parser (`src/utils/parser.ts`)

Supports multiple formats via [confbox](https://github.com/unjs/confbox):

- `.llens.yml` / `.llens.yaml` - YAML
- `.llens.json` - JSON
- `.llens.toml` - TOML
- `.llens.json5` - JSON5

### Type System

All types are defined in `src/types/index.ts` using Zod schemas for runtime validation.

Key types:

```typescript
// Runtime configuration (fully resolved)
interface RuntimeConfig {
  model: string;
  temperature: number;
  timeout: number;
  apiKey: string;
  baseUrl: string;
  response_format?: Record<string, unknown>;
}

// Individual test case
interface Test {
  name: string;
  query: string;
  config?: TestConfig;
  expect: Assertion[];
}

// Test result
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  response: LLMResponse;
  error?: AssertionError;
}
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.0+ (runtime, package manager, test runner)
- TypeScript 5.0+ (peer dependency)

### Setup

```bash
bun install
```

### Scripts

```bash
# Development (hot reload)
bun run dev

# Run tests
bun test

# Run tests in watch mode
bun run test:watch
```

### Project Configuration

**package.json**:

- `type: "module"` - ES modules
- `bin.llens` - CLI entry point
- Scripts: `dev`, `test`, `test:watch`

**tsconfig.json**:

- Target: ESNext
- Module: Preserve (for Bun compatibility)
- Strict mode enabled
- JSX: react-jsx (for potential future use)

### Dependencies

**Runtime:**

- `c12` - Smart configuration loader
- `citty` - CLI framework for building commands
- `confbox` - Multi-format config file parser (YAML, JSON, TOML)
- `picocolors` - Terminal color output
- `zod` - Runtime validation and type inference

**Development:**

- `@types/bun` - Bun type definitions
- `@types/mocha` - Mocha type definitions
- `mocha` - Test execution framework
- `tsx` - TypeScript execution for mocha

**Peer:**

- `typescript` ^5

### Environment Variables

- `LLENS_API_KEY` - API key for LLM provider (required)
- `LLENS_MODEL` - Default model (default: "gpt-4")
- `LLENS_BASE_URL` - API base URL (default: "https://api.openai.com/v1")
- `LLENS_TEMPERATURE` - Temperature setting (default: 0.7)
- `LLENS_TIMEOUT` - Request timeout in ms (default: 30000)

Bun automatically loads `.env` files, so you can use a `.env` file in the project root.

## Coding Conventions

### TypeScript

- Use ES modules (`import`/`export`)
- Prefer `type` imports for type-only imports
- Use Zod schemas for runtime validation
- Follow strict TypeScript settings from `tsconfig.json`
- Use `Bun.file()` for file operations instead of Node.js `fs`

### File Organization

- Place tests alongside source files: `feature.ts` → `feature.test.ts`
- Use kebab-case for filenames
- Export single default per command file
- Group related functionality in modules

### Zod Usage

Define schemas in `src/types/index.ts`, then infer types:

```typescript
// Schema definition
export const MySchema = z.object({
  field: z.string(),
  optional: z.number().optional(),
});

// Type inference
export type MyType = z.infer<typeof MySchema>;
```

### Error Handling

- Use try-catch for async operations
- Provide meaningful error messages
- Exit with code 1 for CLI errors
- Log errors to stderr

### CLI Commands

Each command in `src/commands/` should:

1. Use `defineCommand()` from citty
2. Export default command object
3. Handle args and provide meta information
4. Register in `src/cli.ts` subCommands

## Testing

### Test Runner

Use Bun's built-in test runner (`bun:test`) for unit tests:

```typescript
import { test, expect } from "bun:test";

test("description", () => {
  expect(value).toBe(expected);
});
```

The LLM test runner (`src/core/runner.ts`) uses Mocha's programmatic API to execute integration tests against LLM providers.

### Test Patterns

1. **Unit tests** - Test individual functions in isolation using `bun:test`
2. **Mock external dependencies** - Mock LLM responses for assertion tests
3. **Test edge cases** - Invalid inputs, error conditions
4. **Test CLI commands** - Use child processes or direct function calls

Example test structure:

```typescript
import { test, expect } from "bun:test";
import { evaluateAssertion } from "./assertions";

const mockResponse = (content: string) => ({ content });

test("contains assertion passes", () => {
  const response = mockResponse("Hello world");
  const result = evaluateAssertion(
    response,
    { type: "contains", value: "Hello" },
    100,
  );
  expect(result.pass).toBe(true);
});
```

### Running Tests

```bash
# All unit tests
bun test

# Specific file
bun test src/core/assertions.test.ts

# Watch mode
bun test --watch
```

## Configuration

### Config File Search Order

c12 searches for configuration files in the following order:

1. `llens.config.yml` / `llens.config.yaml` / `llens.config.json` / `llens.config.toml`
2. `.llensrc.yml` / `.llensrc.yaml` / `.llensrc.json` / `.llensrc.toml`
3. Environment variables (LLENS\_\*)
4. Default values

### Environment Variables

- `LLENS_API_KEY` - API key for LLM provider (required)
- `LLENS_MODEL` - Default model (default: "gpt-4")
- `LLENS_BASE_URL` - API base URL (default: "https://api.openai.com/v1")
- `LLENS_TEMPERATURE` - Temperature setting (default: 0.7)
- `LLENS_TIMEOUT` - Request timeout in ms (default: 30000)

c12 also supports loading `.env` files automatically.

### Test File Format

Test files use `.llens.{yml,yaml,json,toml,json5}` extension.

```yaml
name: "Test Suite Name"
config:
  model: gpt-4
  temperature: 0.7

tests:
  - name: "Test Name"
    query: "Prompt to LLM"
    config: # Optional per-test config
      model: gpt-3.5-turbo
    expect:
      - type: contains
        value: "expected text"
```

## CLI Usage

### Commands

```bash
# Run tests (default)
llens run [files] [options]
llens  # same as run

# Create sample test file
llens init [name]

# Validate test file syntax
llens validate [files]
```

### Options

- `--model <model>` - Override model
- `--timeout <ms>` - Override timeout in milliseconds
- `[files]` - Glob pattern for test files (default: `**/*.llens.{yml,yaml,json,toml,json5}`)

### Examples

```bash
# Run all tests in current directory
llens

# Run specific test file
llens run my-test.llens.yml

# Run tests with glob pattern
llens run "tests/**/*.llens.yml"

# Override config
llens run --model gpt-4 --timeout 60000

# Create sample test
llens init my-suite

# Validate all test files
llens validate

# Validate specific file
llens validate my-test.llens.yml
```

## Extending the Project

### Adding a New Assertion Type

1. Add schema to `src/types/index.ts`:

```typescript
export const CustomAssertionSchema = z.object({
  type: z.literal("custom"),
  param: z.string(),
});

export const AssertionSchema = z.union([
  // ... existing schemas
  CustomAssertionSchema,
]);
```

2. Add evaluator to `src/core/assertions.ts`:

```typescript
function evaluateCustom(
  response: LLMResponse,
  assertion: CustomAssertion,
): AssertionResult {
  // Implementation
  return { pass: true, message: "" };
}
```

3. Add case to `evaluateAssertion()` switch statement.

4. Add tests in `src/core/assertions.test.ts`.

### Adding a New Reporter

LLens uses Mocha reporters for output. To add a new reporter:

1. Install a Mocha reporter package (e.g., `mocha-junit-reporter`)
2. Add CLI option in `src/commands/run.ts` for the reporter
3. Pass reporter name via Mocha options

Example:

```bash
llens run --reporter json
llens run --reporter dot
llens run --reporter mocha-junit-reporter
```

### Adding a New Command

1. Create file in `src/commands/{name}.ts`
2. Export command using `defineCommand()` from citty
3. Register in `src/cli.ts` subCommands
4. Add tests for command functionality

### Adding New Configuration Options

1. Update `ConfigFileSchema` in `src/types/index.ts`
2. Update `RuntimeConfig` interface
3. Add to `DEFAULT_CONFIG` in `src/core/config.ts`
4. Add to `mergeConfigs()` function
5. Add environment variable support in `loadFromEnv()`
6. Add CLI argument in relevant commands

## Bun-Specific Guidelines

### Runtime

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`

### APIs

- `Bun.serve()` for HTTP servers (if needed)
- `bun:sqlite` for SQLite (not currently used)
- `Bun.redis` for Redis (not currently used)
- `Bun.sql` for Postgres (not currently used)
- `WebSocket` built-in (not currently used)
- Prefer `Bun.file()` over `node:fs` for file operations
- Use `Bun.$` for shell commands instead of `execa`

### Testing

- Use `bun:test` for all unit tests
- No external test runners needed for unit tests
- Built-in watch mode: `bun test --watch`
- Built-in coverage: `bun test --coverage` (Bun v1.1+)
- LLM integration tests use Mocha via `src/core/runner.ts`

### Development

- Hot reload: `bun --hot ./src/cli.ts`
- Environment variables auto-loaded from `.env`
- No need for `dotenv` package

## Common Patterns

### Working with Test Files

```typescript
import { parseFile } from "./utils/parser";
import { TestFileSchema } from "./types";

// Read and validate
const content = await Bun.file(filePath).text();
const parsed = parseFile(content, filePath);
const testFile = TestFileSchema.parse(parsed);
```

### Configuration Loading

```typescript
import { loadConfig } from "./core/config";

const config = await loadConfig(process.cwd(), {
  model: "gpt-4",
  timeout: 60000,
});
```

### Running Tests

```typescript
import { runTestFile } from "./core/runner";

const stats = await runTestFile(config, testFile, filePath, {
  reporter: "spec",
});
```

## Debugging

### Common Issues

1. **API Key not found**: Set `LLENS_API_KEY` environment variable
2. **Test file not found**: Check glob pattern and file extension
3. **Parse errors**: Validate YAML/JSON syntax
4. **Type errors**: Run `bun test` to catch TypeScript issues

### Debug Tools

- Use `console.log()` for quick debugging (Bun supports colored output)
- Use `bun:test` for unit test debugging
- Use `--reporter json` for machine-readable output

### Logs

- CLI outputs to stdout/stderr via Mocha reporters
- Errors exit with code 1

## Contributing

1. Follow existing code patterns
2. Add tests for new functionality
3. Update documentation
4. Run `bun test` before committing
5. Use TDD approach when possible

## Coding Style Guide

This project aims for clean, readable, and maintainable code. Prefer declarative patterns over imperative ones, and keep code flat and simple.

### Core Principles

1. **Prefer Declarative Over Imperative** - Use array methods and expressions instead of manual iteration

   ```typescript
   // ❌ Imperative: manual loops and mutation
   const results = [];
   for (const item of items) {
     if (item.active) {
       results.push(item.name.toUpperCase());
     }
   }

   // ✅ Declarative: chain array methods
   const results = items
     .filter((item) => item.active)
     .map((item) => item.name.toUpperCase());
   ```

2. **Avoid Deep Nesting** - Use early returns and guard clauses to flatten conditionals

   ```typescript
   // ❌ Deeply nested
   if (user) {
     if (user.isActive) {
       if (user.hasPermission) {
         return process(user);
       } else {
         return { error: "No permission" };
       }
     } else {
       return { error: "User inactive" };
     }
   } else {
     return { error: "No user" };
   }

   // ✅ Flat with early returns
   if (!user) return { error: "No user" };
   if (!user.isActive) return { error: "User inactive" };
   if (!user.hasPermission) return { error: "No permission" };
   return process(user);
   ```

3. **Prefer const, but let is OK when needed** - Default to const, but don't force awkward workarounds

   ```typescript
   // ✅ const by default
   const name = "test";
   const doubled = items.map((x) => x * 2);

   // ✅ let is fine when it makes code clearer
   let result = initialValue;
   if (condition) {
     result = alternativeValue;
   }
   ```

4. **Let Errors Bubble Up** - Catch errors at boundaries, not defensively at every level

   ```typescript
   // ❌ Defensive programming everywhere
   function parseConfig(input: string): Config | null {
     if (!input) return null;
     try {
       const parsed = JSON.parse(input);
       if (!parsed.version) return null;
       return parsed;
     } catch {
       return null;
     }
   }

   function loadConfig(): Config | null {
     const raw = readFileSync("config.json");
     return parseConfig(raw);
   }

   // Caller has to check null at every step
   const config = loadConfig();
   if (!config) {
     /* handle error */
   }

   // ✅ Let errors bubble, catch at boundary
   function parseConfig(input: string): Config {
     if (!input) throw new Error("Empty input");
     const parsed = JSON.parse(input);
     if (!parsed.version) throw new Error("Missing version");
     return parsed;
   }

   function loadConfig(): Config {
     const raw = readFileSync("config.json");
     return parseConfig(raw);
   }

   // Catch once at the boundary
   try {
     const config = loadConfig();
     runApp(config);
   } catch (error) {
     console.error("Failed to start:", error.message);
     process.exit(1);
   }
   ```

5. **Use Lookup Objects Instead of Long Switch/if-else Chains** - Make intent clear with data-driven code

   ```typescript
   // ❌ Switch statement
   function getFormatter(type: string): Formatter {
     switch (type) {
       case "plain":
         return createPlainFormatter();
       case "json":
         return createJsonFormatter();
       case "silent":
         return createSilentFormatter();
       default:
         return createPlainFormatter();
     }
   }

   // ✅ Lookup object
   const formatters: Record<string, () => Formatter> = {
     plain: createPlainFormatter,
     json: createJsonFormatter,
     silent: createSilentFormatter,
   };

   function getFormatter(type: string): Formatter {
     return (formatters[type] ?? formatters.plain)();
   }
   ```

### Best Practices

1. **Keep Functions Small and Focused** - A function should do one thing
2. **Use TypeScript Strictly** - Enable strict mode, avoid `any`, define clear types
3. **Immutability Preferred** - Don't mutate inputs; return new values instead
4. **Meaningful Names** - Variables and functions should describe their purpose
5. **Consistency** - Follow existing patterns in the codebase

### Error Handling

- **Don't write defensive code** - Let errors bubble up to appropriate boundaries
- **Catch at boundaries** - CLI entry points, API handlers, or top-level operations
- **Fail fast** - Throw when something is wrong, don't return null/optional everywhere
- **Provide meaningful messages** - Error messages should explain what went wrong
- **Exit appropriately** - CLI commands should exit with code 1 on failure

## License

MIT
