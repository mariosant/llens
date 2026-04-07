# AGENTS.md

## Project Overview

**llens** is an LLM Quality Assurance Test Runner built with [Bun](https://bun.sh/). It allows you to:

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
│   └── runner.ts       # Test execution orchestrator
├── formatters/         # Output formatters
│   ├── base.ts         # Formatter interface
│   └── plain.ts        # Plain text formatter
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

Config merging priority (highest to lowest):
1. CLI arguments
2. Environment variables
3. Test file `config` section
4. Config file (`.llensrc`, `llens.config.yml`, etc.)
5. Default values

Key functions:
- `loadConfig(cwd, cliOverrides)` - Load and merge all config sources
- `mergeConfigs()` - Merge multiple config levels

#### Test Runner (`src/core/runner.ts`)

The `TestRunner` class orchestrates test execution:
- Merges config for each test
- Creates LLM client instances
- Runs tests sequentially
- Reports results via formatters

#### LLM Client (`src/core/llm-client.ts`)

OpenAI-compatible API client:
- Sends chat completion requests
- Supports `response_format` for JSON mode
- Returns content + token usage

#### Assertions (`src/core/assertions.ts`)

Six assertion types supported:

| Assertion | Description | Parameters |
|-----------|-------------|------------|
| `contains` | Check if response contains substring | `value: string` |
| `matches` | Regex pattern matching | `pattern: string` |
| `json` | Validate response is valid JSON | none |
| `schema` | Validate JSON against Zod schema | `schema: object` |
| `cost` | Check token usage limits | `maxTokens?: number` |
| `latency` | Check response time | `maxMs: number` |

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
- `citty` - CLI framework for building commands
- `confbox` - Multi-format config file parser (YAML, JSON, TOML)
- `picocolors` - Terminal color output
- `zod` - Runtime validation and type inference

**Development:**
- `@types/bun` - Bun type definitions

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

Use Bun's built-in test runner (`bun:test`):

```typescript
import { test, expect } from "bun:test";

test("description", () => {
  expect(value).toBe(expected);
});
```

### Test Patterns

1. **Unit tests** - Test individual functions in isolation
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
  const result = evaluateAssertion(response, { type: "contains", value: "Hello" }, 100);
  expect(result.pass).toBe(true);
});
```

### Running Tests

```bash
# All tests
bun test

# Specific file
bun test src/core/assertions.test.ts

# Watch mode
bun test --watch

# With coverage (Bun v1.1+)
bun test --coverage
```

## Configuration

### Config File Search Order

1. `.llensrc` (YAML)
2. `.llensrc.yml` / `.llensrc.yaml`
3. `.llensrc.json`
4. `.llensrc.toml`
5. `llens.config.yml` / `llens.config.yaml`
6. `llens.config.json`
7. `llens.config.toml`

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
    config:  # Optional per-test config
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
  assertion: CustomAssertion
): AssertionResult {
  // Implementation
  return { pass: true, message: "" };
}
```

3. Add case to `evaluateAssertion()` switch statement.

4. Add tests in `src/core/assertions.test.ts`.

### Adding a New Formatter

1. Implement `Formatter` interface from `src/formatters/base.ts`
2. Create new file in `src/formatters/` (e.g., `json.ts`)
3. Add CLI flag in `src/commands/run.ts` to select formatter
4. Export and register in runner

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

- Use `bun:test` for all tests
- No external test runners needed
- Built-in watch mode: `bun test --watch`
- Built-in coverage: `bun test --coverage` (Bun v1.1+)

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
import { TestRunner } from "./core/runner";
import { PlainFormatter } from "./formatters/plain";

const formatter = new PlainFormatter();
const runner = new TestRunner(config, formatter);
const stats = await runner.runTestFile(testFile, filePath);
```

## Debugging

### Common Issues

1. **API Key not found**: Set `LLENS_API_KEY` environment variable
2. **Test file not found**: Check glob pattern and file extension
3. **Parse errors**: Validate YAML/JSON syntax
4. **Type errors**: Run `bun test` to catch TypeScript issues

### Debug Tools

- `debug-validate.ts` - Script for debugging file parsing
- Use `console.log()` for quick debugging (Bun supports colored output)
- Use `bun:test` for unit test debugging

### Logs

- CLI outputs to stdout/stderr
- Formatter handles test result display
- Errors exit with code 1

## Contributing

1. Follow existing code patterns
2. Add tests for new functionality
3. Update documentation
4. Run `bun test` before committing
5. Use TDD approach when possible

## Functional Programming Style Guide

This project follows a strict functional programming style. All code must adhere to these principles:

### Core Principles

1. **No Classes** - Use factory functions and closures instead of classes
   ```typescript
   // ❌ Don't use classes
   class MyClass {
     private value: number;
     constructor(v: number) { this.value = v; }
     getValue() { return this.value; }
   }
   
   // ✅ Use factory functions
   const createMyThing = (value: number) => ({
     getValue: () => value,
   });
   ```

2. **No Mutable Variables** - Use `const` only, never `let` or `var`
   ```typescript
   // ❌ Don't use let
   let count = 0;
   for (const item of items) {
     count += 1;
   }
   
   // ✅ Use const with reduce
   const count = items.reduce((acc) => acc + 1, 0);
   ```

3. **No Loops** - Use array methods instead of `for`, `while`, `for...of`
   ```typescript
   // ❌ Don't use loops
   const results = [];
   for (const item of items) {
     results.push(transform(item));
   }
   
   // ✅ Use map
   const results = items.map(transform);
   ```

4. **No Try/Catch** - Use the `Result<T, E>` type for error handling
   ```typescript
   import { ok, err, tryAsync, type Result } from "./utils/result";
   
   // ❌ Don't throw
   async function fetchData(): Promise<Data> {
     const response = await fetch(url);
     if (!response.ok) throw new Error("Failed");
     return response.json();
   }
   
   // ✅ Return Result type
   async function fetchData(): Promise<Result<Data, Error>> {
     const responseResult = await tryAsync(() => fetch(url));
     if (responseResult.kind === "err") return responseResult;
     // ... continue with success case
     return ok(data);
   }
   ```

5. **No Nested Conditionals** - Use early returns, lookup objects, or pattern matching
   ```typescript
   // ❌ Avoid nested if/else
   if (conditionA) {
     if (conditionB) {
       return value1;
     } else {
       return value2;
     }
   } else {
     return value3;
   }
   
   // ✅ Use early returns
   if (!conditionA) return value3;
   if (!conditionB) return value2;
   return value1;
   
   // ✅ Or use lookup objects
   const handlers: Record<Type, () => Result> = {
     typeA: handleA,
     typeB: handleB,
   };
   return handlers[value.type]();
   ```

### Functional Utilities

The project provides utilities in `src/utils/result.ts` and `src/utils/functional.ts`:

#### Result Type (Either Monad)
```typescript
import { ok, err, isOk, isErr, map, flatMap, unwrapOr } from "./utils/result";

// Creating results
const success = ok(value);
const failure = err(error);

// Transforming results
const mapped = map((x) => x * 2)(success); // Result<number, Error>
const flatMapped = flatMap((x) => ok(x * 2))(success);

// Extracting values
const value = unwrapOr(defaultValue)(result);
```

#### Array Utilities (Point-free Style)
```typescript
import { mapArray, filterArray, reduceArray, traverse } from "./utils/functional";

// All utilities are curried for composition
const double = mapArray((x: number) => x * 2);
const evens = filterArray((x: number) => x % 2 === 0);
const sum = reduceArray((a: number, b: number) => a + b, 0);

// Async operations
const fetchAll = traverse((url: string) => fetch(url));
```

### Error Handling Pattern

Always handle errors explicitly using the Result type:

```typescript
import { ok, err, tryAsync, type Result } from "./utils/result";

async function operation(): Promise<Result<Data, AppError>> {
  // Wrap operations that might throw
  const result = await tryAsync(() => fetchData());
  
  // Handle error case early
  if (result.kind === "err") {
    return err({ kind: "app_error", message: result.error.message });
  }
  
  // Continue with success
  const data = result.value;
  return ok(transform(data));
}

// Usage
const result = await operation();
if (isOk(result)) {
  console.log("Success:", result.value);
} else {
  console.error("Error:", result.error);
}
```

### Configuration Pattern

Use pure functions for configuration:

```typescript
// config.ts
const DEFAULT_CONFIG: RuntimeConfig = {
  model: "gpt-4",
  temperature: 0.7,
};

export const mergeConfigs = (
  ...configs: ReadonlyArray<Partial<RuntimeConfig>>
): RuntimeConfig =>
  configs.reduce(
    (merged, config) =>
      config ? ({ ...merged, ...config } as RuntimeConfig) : merged,
    DEFAULT_CONFIG
  );
```

### Factory Pattern

Use factory functions instead of constructors:

```typescript
// llm-client.ts
export const createLLMClient = (config: RuntimeConfig) => ({
  complete: (query: string): Promise<Result<LLMResponse, LLMError>> =>
    callLLM(config, query),
});

export type LLMClient = ReturnType<typeof createLLMClient>;
```

### Formatter Pattern

Formatters should be pure functions returning strings:

```typescript
export const createPlainFormatter = (): Formatter => ({
  suiteStart: (name: string) => `${pc.bold(name)}\n\n`,
  testPass: (name, result) =>
    `  ${pc.green("✓")} ${name} ${pc.gray(`(${result.duration}ms)`)}\n`,
  // ... all methods return strings, no console.log
});
```

### Best Practices

1. **Immutability**: Use `readonly` arrays and objects, never mutate
2. **Composition**: Build complex operations by composing simple functions
3. **Type Safety**: Use TypeScript strict mode, avoid `any`
4. **Pure Functions**: Same input → same output, no side effects
5. **Early Returns**: Flatten conditionals with guard clauses
6. **Lookup Objects**: Replace switch statements with record lookups
7. **Point-Free Style**: Use currying for composable utilities

### Testing

Test the functional code:

```typescript
import { test, expect } from "bun:test";
import { isOk, isErr } from "./utils/result";

test("operation should return ok on success", async () => {
  const result = await operation();
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.value).toBe(expected);
  }
});

test("operation should return err on failure", async () => {
  const result = await operationWithError();
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.message).toContain("error");
  }
});
```

## License

MIT