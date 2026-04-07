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

Uses [c12](https://github.com/unjs/c12) for smart configuration loading.

Configuration is loaded in this priority order (highest first):

1. CLI arguments (`--model`, `--timeout`)
2. Environment variables (`LLENS_API_KEY`, `LLENS_MODEL`, etc.)
3. Config file (`llens.config.yml`, `.llensrc.yml`, etc.)
4. Defaults

### Config File

Create `llens.config.yml` in your project root:

```yaml
model: gpt-4
temperature: 0.7
timeout: 30000
apiKey: ${OPENAI_API_KEY} # or set via LLENS_API_KEY env var
baseUrl: https://api.openai.com/v1
```

Supported formats: YAML, JSON, TOML, JSON5

**Config file search order (c12):**

- `llens.config.yml` / `llens.config.yaml` / `llens.config.json` / `llens.config.toml`
- `.llensrc.yml` / `.llensrc.yaml` / `.llensrc.json` / `.llensrc.toml`

### Environment Variables

- `LLENS_API_KEY` - API key for LLM provider
- `LLENS_MODEL` - Default model to use
- `LLENS_BASE_URL` - API base URL
- `LLENS_TEMPERATURE` - Temperature setting
- `LLENS_TIMEOUT` - Request timeout in milliseconds

c12 also supports loading `.env` files automatically.

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
    config: # Optional: per-test config
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

## License

MIT
