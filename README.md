# llens

LLM Quality Assurance Test Runner - Test your LLM prompts and validate responses with assertions.

## Overview

llens is a CLI tool for testing LLM (Large Language Model) outputs against defined assertions. It allows you to:

- Write declarative test files in YAML/JSON/TOML/JSON5
- Test LLM responses for content matching, JSON validity, schema compliance, cost, and latency
- Run tests against OpenAI-compatible APIs
- Validate test file syntax without running tests

## Installation

```bash
bun install
```

## Quick Start

### 1. Create a test file

```bash
bun run src/cli.ts init my-test
```

This creates `my-test.llens.yml` with sample tests.

### 2. Set your API key

```bash
export LLENS_API_KEY=your-openai-api-key
```

### 3. Run tests

```bash
bun run src/cli.ts run my-test.llens.yml
```

## Configuration

Configuration is loaded in this priority order (highest first):

1. CLI arguments (`--model`, `--timeout`)
2. Environment variables (`LLENS_API_KEY`, `LLENS_MODEL`, etc.)
3. Test file `config` section
4. Config file (`.llensrc`, `llens.config.yml`, etc.)
5. Defaults

### Config File

Create `.llensrc.yml` in your project root:

```yaml
model: gpt-4
temperature: 0.7
timeout: 30000
apiKey: ${OPENAI_API_KEY}  # or set via LLENS_API_KEY env var
baseUrl: https://api.openai.com/v1
```

Supported formats: YAML, JSON, TOML

**Config file search order:**
- `.llensrc` (YAML)
- `.llensrc.yml` / `.llensrc.yaml`
- `.llensrc.json`
- `.llensrc.toml`
- `llens.config.yml` / `llens.config.yaml`
- `llens.config.json`
- `llens.config.toml`

### Environment Variables

- `LLENS_API_KEY` - API key for LLM provider
- `LLENS_MODEL` - Default model to use
- `LLENS_BASE_URL` - API base URL
- `LLENS_TEMPERATURE` - Temperature setting
- `LLENS_TIMEOUT` - Request timeout in milliseconds

## Test File Format

Test files use the `.llens.{yml,yaml,json,toml,json5}` extension.

```yaml
# Optional: Name of the test suite
name: "My Test Suite"

# Optional: Default config for all tests in this file
config:
  model: gpt-4
  temperature: 0.7
  timeout: 30000

tests:
  - name: "Test name"
    query: "Your prompt to the LLM"
    config:  # Optional: per-test config
      model: gpt-3.5-turbo
    expect:
      - type: contains
        value: "expected text"
```

## Assertions

### contains

Check if response contains specific text:

```yaml
- type: contains
  value: "Paris"
```

### matches

Check if response matches a regex pattern:

```yaml
- type: matches
  pattern: "capital.*France"
# Or with flags:
- type: matches
  pattern: "/hello/i"
```

### json

Validate that response is valid JSON:

```yaml
- type: json
```

### schema

Validate JSON response against a schema:

```yaml
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
```

### cost

Check token usage limits:

```yaml
- type: cost
  maxTokens: 1000
```

### latency

Check response time:

```yaml
- type: latency
  maxMs: 5000
```

## CLI Commands

### run (default)

Run test files:

```bash
# Run all test files in current directory
llens

# Run specific files (supports glob patterns)
llens run "tests/**/*.llens.yml"
llens run my-test.llens.yml

# Override config
llens run --model gpt-4 --timeout 60000
```

### init

Create a sample test file:

```bash
llens init              # Creates test.llens.yml
llens init my-suite     # Creates my-suite.llens.yml
```

### validate

Validate test file syntax without running:

```bash
llens validate                    # Validate all test files
llens validate my-test.llens.yml  # Validate specific file
```

## Example Test Suite

```yaml
name: "Capital Cities Tests"
config:
  model: gpt-4
  temperature: 0.5

tests:
  - name: "Capital of France"
    query: "What is the capital of France?"
    expect:
      - type: contains
        value: "Paris"
      - type: matches
        pattern: "capital.*France"

  - name: "JSON Response"
    query: 'Return a JSON object with "city" and "country" fields'
    config:
      response_format:
        type: json_object
    expect:
      - type: json
      - type: schema
        schema:
          type: object
          properties:
            city:
              type: string
            country:
              type: string
          required:
            - city
            - country
      - type: latency
        maxMs: 3000
```

## Project Architecture

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
4. Config file
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

```bash
# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run CLI in development mode
bun run dev -- run my-test.llens.yml
```

### Adding New Features

#### Adding a New Assertion Type

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

#### Adding a New Formatter

1. Implement `Formatter` interface from `src/formatters/base.ts`
2. Add CLI flag in `src/commands/run.ts` to select formatter

#### Adding a New Command

1. Create file in `src/commands/{name}.ts`
2. Export command using `defineCommand()` from citty
3. Register in `src/cli.ts` subCommands

### Testing Guidelines

Tests use Bun's built-in test runner (`bun:test`).

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Specific file
bun test src/core/assertions.test.ts
```

**Test File Naming:** Place tests alongside source files: `feature.ts` → `feature.test.ts`

**TDD Approach:**
1. Write failing test first (Red)
2. Implement minimal code to pass (Green)
3. Refactor while keeping tests green

## Technology Stack

- **Runtime:** Bun (not Node.js)
- **CLI Framework:** citty
- **Parsing:** confbox (YAML/JSON/TOML/JSON5)
- **Validation:** Zod
- **Colors:** picocolors
- **Testing:** bun:test

## License

MIT
