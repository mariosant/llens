---
name: llens
description: Use when creating, updating, or configuring LLM quality assurance tests with llens. Covers .llens.yml/.llens.json test files, all assertion types (contains, matches, json, schema, cost, latency), configuration files, and test execution. Essential for validating LLM outputs.
license: MIT
metadata:
  author: github.com/mariosant
  version: "0.1.0"
---

# LLens Testing Skill

Use this skill as an instruction set when working with LLM quality assurance tests.

## When to Use This Skill

Use this skill when the user:

- Wants to create, update, or configure LLM tests
- Mentions `.llens` files, test files, or LLM testing
- Needs to validate LLM outputs against assertions
- Wants to set up CI/CD for LLM quality gates
- Asks about llens configuration or test patterns

## What is LLens?

LLens is an LLM Quality Assurance Test Runner that allows you to:

- Write declarative test files in YAML, JSON, TOML, or JSON5
- Test LLM responses against assertions (content, JSON, schema, cost, latency)
- Run tests against OpenAI-compatible APIs
- Validate test file syntax without execution

## Quick Start

### Create a New Test File

```bash
llens init my-test-suite
```

This creates `my-test-suite.llens.yml` with example tests.

### Run Tests

```bash
llens run                    # Run all tests in current directory
llens run my-test.llens.yml  # Run specific file
llens validate              # Validate syntax without running
```

### Basic Test File Structure

```yaml
name: "My Test Suite"
config:
  model: gpt-4
  temperature: 0.7
  timeout: 30000

tests:
  - name: "Test description"
    query: "Prompt to send to LLM"
    expect:
      - type: contains
        value: "expected text"
```

## Test File Format

Test files use the `.llens.yml`, `.llens.yaml`, `.llens.json`, `.llens.toml`, or `.llens.json5` extension.

### Top-Level Fields

| Field    | Required | Description                         |
| -------- | -------- | ----------------------------------- |
| `name`   | No       | Suite name for reporting            |
| `config` | No       | Default configuration for all tests |
| `tests`  | Yes      | Array of test definitions           |

### Test Definition Fields

| Field    | Required | Description                     |
| -------- | -------- | ------------------------------- |
| `name`   | Yes      | Test name for reporting         |
| `query`  | Yes      | Prompt sent to the LLM          |
| `config` | No       | Per-test config overrides       |
| `expect` | Yes      | Array of assertions to validate |

### Per-Test Configuration Override

Override defaults for specific tests:

```yaml
tests:
  - name: "Use faster model"
    query: "Simple question"
    config:
      model: gpt-3.5-turbo
    expect:
      - type: contains
        value: "answer"
```

## Assertion Types

LLens supports 6 assertion types. See [references/assertions.md](references/assertions.md) for detailed documentation with examples.

| Type       | Purpose                     | Key Parameters                             |
| ---------- | --------------------------- | ------------------------------------------ |
| `contains` | Check substring presence    | `value: string`                            |
| `matches`  | Regex pattern matching      | `pattern: string` (e.g., `"/regex/flags"`) |
| `json`     | Validate JSON structure     | none                                       |
| `schema`   | Validate against Zod schema | `schema: object`                           |
| `cost`     | Check token usage           | `maxTokens?: number`                       |
| `latency`  | Check response time         | `maxMs: number`                            |

### Assertion Examples

**Contains:**

```yaml
expect:
  - type: contains
    value: "expected substring"
```

**Matches (with regex):**

```yaml
expect:
  - type: matches
    pattern: "\\d{4}-\\d{2}-\\d{2}" # Date pattern
```

**JSON validation:**

```yaml
expect:
  - type: json
```

**Schema validation:**

```yaml
expect:
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
```

**Cost (token limit):**

```yaml
expect:
  - type: cost
    maxTokens: 1000
```

**Latency (response time):**

```yaml
expect:
  - type: latency
    maxMs: 5000
```

## Configuration System

LLens uses a layered configuration system. See [references/configuration.md](references/configuration.md) for full details.

### Configuration Priority (Highest to Lowest)

1. **CLI arguments** - `--model`, `--timeout`, etc.
2. **Environment variables** - `LLENS_MODEL`, `LLENS_API_KEY`, etc.
3. **Config file** - `llens.config.yml`, `.llensrc.yml`, etc.
4. **Default values**

### Config Options

| Option        | Type    | Default                     | Description                      |
| ------------- | ------- | --------------------------- | -------------------------------- |
| `model`       | string  | `gpt-4`                     | Model identifier                 |
| `temperature` | number  | `0.7`                       | Sampling temperature             |
| `timeout`     | number  | `30000`                     | Request timeout (ms)             |
| `apiKey`      | string  | -                           | API key (or via `LLENS_API_KEY`) |
| `baseUrl`     | string  | `https://api.openai.com/v1` | API endpoint                     |
| `failFast`    | boolean | `false`                     | Stop on first failure            |

### Environment Variables

Set these instead of config files for CI/CD:

```bash
LLENS_API_KEY=sk-...        # Required
LLENS_MODEL=gpt-4           # Default: gpt-4
LLENS_BASE_URL=https://api.openai.com/v1
LLENS_TEMPERATURE=0.7
LLENS_TIMEOUT=30000
LLENS_FAIL_FAST=false
```

## Running Tests

### Run Commands

```bash
llens                      # Run all tests (default pattern: **/*.llens.{yml,yaml,json,toml,json5})
llens run                  # Same as above
llens run "tests/**/*.llens.yml"  # Custom glob pattern
llens run --model gpt-4    # Override model via CLI
llens run --timeout 60000  # Override timeout via CLI
```

### Validate Without Running

```bash
llens validate                    # Validate all test files
llens validate my-test.llens.yml  # Validate specific file
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Common Patterns

See [references/examples.md](references/examples.md) for comprehensive examples.

### Content Validation

Validate that LLM responses contain expected text:

```yaml
tests:
  - name: "Capital of France"
    query: "What is the capital of France?"
    expect:
      - type: contains
        value: "Paris"
```

### Structured JSON Output

Test that LLM returns valid JSON matching a schema:

```yaml
tests:
  - name: "User data extraction"
    query: "Extract user info from: John is 30 years old"
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
```

### Regex Pattern Matching

Validate response format with regex:

```yaml
tests:
  - name: "Email validation"
    query: "Generate a valid email address"
    expect:
      - type: matches
        pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
```

### Performance Testing

Set cost and latency budgets:

```yaml
tests:
  - name: "Fast response required"
    query: "Simple factual question"
    expect:
      - type: latency
        maxMs: 2000
      - type: cost
        maxTokens: 50
```

### Multi-Model Comparison

Test the same prompt across different models:

```yaml
tests:
  - name: "GPT-4 answer"
    query: "Explain quantum entanglement"
    config:
      model: gpt-4
    expect:
      - type: contains
        value: "entanglement"

  - name: "GPT-3.5 answer"
    query: "Explain quantum entanglement"
    config:
      model: gpt-3.5-turbo
    expect:
      - type: contains
        value: "entanglement"
```

### Chatbot Conversation Testing

Test multi-turn conversations by structuring queries:

```yaml
tests:
  - name: "Contextual follow-up"
    query: |
      Previous: What is the capital of France?
      Answer: Paris is the capital of France.
      Follow-up: What country is it in?
    expect:
      - type: contains
        value: "France"
```

## Validation & Troubleshooting

### Validate Test Files

Always validate before running:

```bash
llens validate
```

### Check Configuration

Ensure required environment variables are set:

```bash
echo $LLENS_API_KEY  # Must be set
```

### Debug Failed Assertions

Run with verbose output to see actual LLM responses:

```bash
llens run --reporter spec
```

### Common Issues

| Issue                      | Solution                                                       |
| -------------------------- | -------------------------------------------------------------- |
| `LLENS_API_KEY not found`  | Set `LLENS_API_KEY` environment variable                       |
| `No test files found`      | Check file extension is `.llens.yml` (not `.yaml`)             |
| `JSON assertion failed`    | LLM returned invalid JSON; use `contains` or `matches` instead |
| `Schema validation failed` | Response JSON doesn't match schema; check required fields      |

## Additional Resources

- [references/assertions.md](references/assertions.md) - Detailed assertion documentation with examples
- [references/configuration.md](references/configuration.md) - Complete configuration reference
- [references/examples.md](references/examples.md) - Comprehensive use case examples
- [assets/starter-template.yml](assets/starter-template.yml) - Production-ready starter template
