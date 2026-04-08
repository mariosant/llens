# Configuration Reference

Complete guide to configuring llens for your environment and test suites.

## Configuration Priority

LLens merges configuration from multiple sources. Priority (highest to lowest):

1. **CLI arguments** - `--model`, `--timeout`, etc.
2. **Environment variables** - `LLENS_MODEL`, `LLENS_API_KEY`, etc.
3. **Config file** - `llens.config.yml`, `.llensrc.yml`, etc.
4. **Default values**

This means CLI arguments override environment variables, which override config files.

## Config File Locations

LLens searches for configuration files in this order:

1. `llens.config.yml` / `llens.config.yaml`
2. `llens.config.json`
3. `llens.config.toml`
4. `.llensrc.yml` / `.llensrc.yaml`
5. `.llensrc.json`
6. `.llensrc.toml`

The first one found is used. Config files are searched from the current working directory upward.

## Configuration Options

| Option        | Type    | Default                     | Description                                       |
| ------------- | ------- | --------------------------- | ------------------------------------------------- |
| `model`       | string  | `gpt-4`                     | Model identifier (e.g., `gpt-4`, `gpt-3.5-turbo`) |
| `temperature` | number  | `0.7`                       | Sampling temperature (0.0 to 2.0)                 |
| `timeout`     | number  | `30000`                     | Request timeout in milliseconds                   |
| `apiKey`      | string  | -                           | API key for the LLM provider                      |
| `baseUrl`     | string  | `https://api.openai.com/v1` | API endpoint base URL                             |
| `failFast`    | boolean | `false`                     | Stop on first test failure                        |

## Environment Variables

Set these for CI/CD environments or when you don't want config files in version control.

| Variable            | Type    | Default                     | Description                            |
| ------------------- | ------- | --------------------------- | -------------------------------------- |
| `LLENS_API_KEY`     | string  | -                           | **Required.** API key for LLM provider |
| `LLENS_MODEL`       | string  | `gpt-4`                     | Default model                          |
| `LLENS_BASE_URL`    | string  | `https://api.openai.com/v1` | API base URL                           |
| `LLENS_TEMPERATURE` | number  | `0.7`                       | Temperature setting                    |
| `LLENS_TIMEOUT`     | number  | `30000`                     | Timeout in milliseconds                |
| `LLENS_FAIL_FAST`   | boolean | `false`                     | Stop on first failure                  |

### Setting Environment Variables

**Bash/Linux/macOS:**

```bash
export LLENS_API_KEY=sk-your-key-here
export LLENS_MODEL=gpt-4
```

**In `.env` file (auto-loaded by llens):**

```bash
LLENS_API_KEY=sk-your-key-here
LLENS_MODEL=gpt-4
LLENS_TEMPERATURE=0.5
```

**CI/CD Examples:**

GitHub Actions:

```yaml
env:
  LLENS_API_KEY: ${{ secrets.LLENS_API_KEY }}
  LLENS_MODEL: gpt-4
```

## CLI Arguments

Override configuration when running tests:

| Argument          | Type   | Description                      |
| ----------------- | ------ | -------------------------------- |
| `--model <model>` | string | Override model                   |
| `--timeout <ms>`  | number | Override timeout in milliseconds |

```bash
llens run --model gpt-4
llens run --model gpt-3.5-turbo --timeout 60000
```

## Test-Specific Configuration

Override configuration per-test using the `config` field:

```yaml
name: "My Test Suite"
config:
  model: gpt-4
  temperature: 0.7

tests:
  - name: "Standard test"
    query: "A simple question"
    expect:
      - type: contains
        value: "answer"

  - name: "Fast model for simple query"
    query: "What's 2+2?"
    config:
      model: gpt-3.5-turbo
      temperature: 0.0
    expect:
      - type: contains
        value: "4"
```

### Per-Test Config Override Fields

| Field             | Type   | Overrides               | Description             |
| ----------------- | ------ | ----------------------- | ----------------------- |
| `model`           | string | Top-level `model`       | Use different model     |
| `temperature`     | number | Top-level `temperature` | Override temperature    |
| `timeout`         | number | Top-level `timeout`     | Per-test timeout        |
| `response_format` | object | -                       | JSON mode configuration |

## JSON Mode Configuration

To force JSON output from compatible models:

```yaml
config:
  response_format:
    type: json_object
```

This enables JSON mode on models that support it (e.g., GPT-4 with `response_format`).

## Examples

### Minimal Config File (YAML)

```yaml
llens.config.yml
```

```yaml
model: gpt-4
```

### Full Config File

```yaml
llens.config.yml
```

```yaml
model: gpt-4
temperature: 0.7
timeout: 30000
baseUrl: https://api.openai.com/v1
failFast: false
```

### JSON Config

```json
llens.config.json
```

```json
{
  "model": "gpt-4",
  "temperature": 0.5,
  "timeout": 60000,
  "failFast": true
}
```

### TOML Config

```toml
llens.config.toml
```

```toml
model = "gpt-4"
temperature = 0.7
timeout = 30000
failFast = false
```

### Environment Variable Only (No Config File)

```bash
# Set required API key
export LLENS_API_KEY=sk-your-key-here

# Run with all defaults
llens run
```

### Multi-Environment Setup

Create environment-specific configs:

```bash
# .env.development
LLENS_MODEL=gpt-4
LLENS_TEMPERATURE=0.7

# .env.production
LLENS_MODEL=gpt-4
LLENS_TEMPERATURE=0.5
LLENS_FAIL_FAST=true
```

Load specific environment:

```bash
export $(cat .env.production | xargs)
llens run
```

### CI/CD Configuration

GitHub Actions workflow:

```yaml
name: LLM Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Run llens tests
        env:
          LLENS_API_KEY: ${{ secrets.LLENS_API_KEY }}
          LLENS_MODEL: gpt-4
        run: npm test
```

### Per-Test Model Comparison

Test same query across models:

```yaml
name: "Model Comparison"
config:
  temperature: 0.0

tests:
  - name: "GPT-4 factual accuracy"
    query: "What is the chemical symbol for gold?"
    config:
      model: gpt-4
    expect:
      - type: matches
        pattern: "Au"

  - name: "GPT-3.5 factual accuracy"
    query: "What is the chemical symbol for gold?"
    config:
      model: gpt-3.5-turbo
    expect:
      - type: matches
        pattern: "Au"
```

## Troubleshooting

### API Key Not Found

```
Error: LLENS_API_KEY environment variable not set
```

**Solution:** Set `LLENS_API_KEY` before running:

```bash
export LLENS_API_KEY=sk-your-key-here
llens run
```

### Config File Not Found

LLens doesn't error if no config file exists - it uses defaults. To verify which config is loaded, check by running:

```bash
llens validate
```

### Model Not Found

Ensure the model name matches your provider's format:

- OpenAI: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Azure OpenAI: Your deployment name
- Other providers: Check their model naming

### Timeout Errors

If requests timeout, increase the timeout:

```yaml
config:
  timeout: 60000 # 60 seconds
```

Or via CLI:

```bash
llens run --timeout 60000
```
