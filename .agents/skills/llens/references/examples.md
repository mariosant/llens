# Examples

Comprehensive examples demonstrating llens test patterns and use cases.

## Content Validation

### Basic Contains Check

Verify the LLM response contains expected text:

```yaml
name: "Content Validation Tests"
tests:
  - name: "Capital of France"
    query: "What is the capital of France?"
    expect:
      - type: contains
        value: "Paris"

  - name: "Water chemical formula"
    query: "What is the chemical formula for water?"
    expect:
      - type: contains
        value: "H2O"

  - name: "Sun rises in east"
    query: "Which direction does the sun rise?"
    expect:
      - type: contains
        value: "east"
```

### Multiple Contains Assertions

All assertions must pass:

```yaml
tests:
  - name: "Python description"
    query: "What is Python programming language?"
    expect:
      - type: contains
        value: "programming"
      - type: contains
        value: "language"
      - type: contains
        value: "Python"
```

### Case-Insensitive Matching

Use regex with case-insensitive flag:

```yaml
tests:
  - name: "Case insensitive match"
    query: "What is the capital of france?"
    expect:
      - type: matches
        pattern: "/Paris/i"
```

## Regex Pattern Matching

### Email Format Validation

```yaml
tests:
  - name: "Generate valid email"
    query: "Generate a random email address"
    expect:
      - type: matches
        pattern: "/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/"
```

### Date Format (ISO 8601)

```yaml
tests:
  - name: "Date format"
    query: "What is today's date?"
    expect:
      - type: matches
        pattern: "\\d{4}-\\d{2}-\\d{2}"
```

### URL Validation

```yaml
tests:
  - name: "URL extraction"
    query: "Find a URL in this text: Check out https://example.com for more info"
    expect:
      - type: matches
        pattern: "https?://[\\w.-]+(?:/[\\w./-]*)?"
```

### Phone Number Format (US)

```yaml
tests:
  - name: "US phone format"
    query: "Format this phone number: 5551234567"
    expect:
      - type: matches
        pattern: "/\\(?\\d{3}\\)?[-\\s.]?\\d{3}[-\\s.]?\\d{4}/"
```

### UUID/GUID Validation

```yaml
tests:
  - name: "Generate UUID"
    query: "Generate a UUID"
    expect:
      - type: matches
        pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
```

## JSON API Testing

### Basic JSON Response

```yaml
tests:
  - name: "Simple JSON object"
    query: 'Return JSON with a "name" field set to "John"'
    config:
      response_format:
        type: json_object
    expect:
      - type: json
```

### JSON Schema Validation

```yaml
tests:
  - name: "User object structure"
    query: "Extract user info from: John is 30 years old and works as a developer"
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
            profession:
              type: string
          required:
            - name
```

### Nested JSON Structure

```yaml
tests:
  - name: "Nested company structure"
    query: "Extract from: Apple Inc is headquartered in Cupertino and has 150000 employees"
    config:
      response_format:
        type: json_object
    expect:
      - type: json
      - type: schema
        schema:
          type: object
          properties:
            company:
              type: object
              properties:
                name:
                  type: string
                headquarters:
                  type: string
                employees:
                  type: number
          required:
            - company
```

### Array Response

```yaml
tests:
  - name: "List of fruits"
    query: "List 5 fruits as a JSON array"
    config:
      response_format:
        type: json_object
    expect:
      - type: json
```

### JSON Array of Objects

```yaml
tests:
  - name: "Todo list items"
    query: "Create a todo list with 2 items"
    config:
      response_format:
        type: json_object
    expect:
      - type: json
      - type: schema
        schema:
          type: object
          properties:
            todos:
              type: array
          required:
            - todos
```

## Code Generation Testing

### Code Completion Validation

```yaml
tests:
  - name: "Python function generation"
    query: |
      Write a Python function called 'add' that takes two numbers and returns their sum
    expect:
      - type: contains
        value: "def add"
      - type: contains
        value: "return"
      - type: matches
        pattern: "add\\([\\s\\S]*\\)" # Function call pattern
```

### SQL Query Validation

```yaml
tests:
  - name: "SELECT query"
    query: "Write a SQL query to select all users where age > 21"
    expect:
      - type: contains
        value: "SELECT"
      - type: contains
        value: "FROM"
      - type: matches
        pattern: "WHERE"
      - type: matches
        pattern: "age"
```

### Markdown Documentation

```yaml
tests:
  - name: "README section"
    query: "Write a README section for a function called 'calculate_average'"
    expect:
      - type: contains
        value: "calculate_average"
      - type: contains
        value: "Parameters"
      - type: contains
        value: "Returns"
```

## Performance Testing

### Latency Budget

```yaml
tests:
  - name: "Fast factual response"
    query: "What is 2+2?"
    expect:
      - type: latency
        maxMs: 3000
```

### Token Budget

```yaml
tests:
  - name: "Concise response"
    query: "What is the capital of France? Answer in one short sentence."
    expect:
      - type: cost
        maxTokens: 50
```

### Combined Performance

```yaml
tests:
  - name: "Efficient extraction"
    query: "Extract the main topic from: The quick brown fox jumps over the lazy dog"
    expect:
      - type: latency
        maxMs: 5000
      - type: cost
        maxTokens: 100
      - type: contains
        value: "fox"
```

### High-Volume Cost Control

```yaml
tests:
  - name: "Token budget enforcement"
    query: "Explain quantum computing in detail"
    expect:
      - type: cost
        maxTokens: 500 # Stop if response exceeds 500 tokens
      - type: contains
        value: "quantum"
```

## Multi-Model Comparison

### Same Prompt, Different Models

```yaml
name: "Model Comparison"
config:
  temperature: 0.0

tests:
  - name: "GPT-4 answer"
    query: "What is the square root of 144?"
    config:
      model: gpt-4
    expect:
      - type: matches
        pattern: "12"

  - name: "GPT-3.5 answer"
    query: "What is the square root of 144?"
    config:
      model: gpt-3.5-turbo
    expect:
      - type: matches
        pattern: "12"

  - name: "GPT-4-Turbo answer"
    query: "What is the square root of 144?"
    config:
      model: gpt-4-turbo
    expect:
      - type: matches
        pattern: "12"
```

### Model-Specific Behavior

```yaml
tests:
  - name: "GPT-4 detailed response"
    query: "Explain photosynthesis"
    config:
      model: gpt-4
    expect:
      - type: cost
        maxTokens: 300
      - type: contains
        value: "chlorophyll"

  - name: "GPT-3.5-Turbo concise response"
    query: "Explain photosynthesis"
    config:
      model: gpt-3.5-turbo
    expect:
      - type: cost
        maxTokens: 150
      - type: contains
        value: "plants"
```

## Chat/Conversation Testing

### Single Turn Q&A

```yaml
tests:
  - name: "Direct question"
    query: "What is the tallest mountain in the world?"
    expect:
      - type: contains
        value: "Everest"
```

### Contextual Follow-up

```yaml
tests:
  - name: "Conversation follow-up"
    query: |
      Q: What is the capital of France?
      A: Paris is the capital of France.
      Q: What country is it in?
    expect:
      - type: contains
        value: "France"
```

### Multi-Turn Conversation

```yaml
tests:
  - name: "Conversation context"
    query: |
      You are helping plan a trip to Paris.
      User: I want to visit the Eiffel Tower.
      Assistant: Great choice! The Eiffel Tower is in Paris, France.
      User: How tall is it?
    expect:
      - type: contains
        value: "330"
      - type: matches
        pattern: "meters?|metres?"
```

## Error Handling

### Invalid JSON Recovery

```yaml
tests:
  - name: "Force JSON mode"
    query: 'Return a JSON object with fields "status" and "message"'
    config:
      model: gpt-4
      response_format:
        type: json_object
    expect:
      - type: json
      - type: schema
        schema:
          type: object
          properties:
            status:
              type: string
            message:
              type: string
          required:
            - status
            - message
```

### Empty Response Handling

```yaml
tests:
  - name: "Non-empty response"
    query: "Say hello"
    expect:
      - type: matches
        pattern: "[a-zA-Z]+" # At least some letters
```

## Advanced Patterns

### Multiple Assertions with Different Types

```yaml
tests:
  - name: "Comprehensive validation"
    query: "Generate a random UUID and also tell me today's date"
    expect:
      - type: matches
        pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
      - type: matches
        pattern: "\\d{4}-\\d{2}-\\d{2}"
```

### Exact Match with Regex

```yaml
tests:
  - name: "Precise boolean response"
    query: "Is the sky blue? Answer only yes or no."
    expect:
      - type: matches
        pattern: "/^(yes|no)$/i"
```

### Whitespace-Insensitive Matching

```yaml
tests:
  - name: "Flexible formatting"
    query: "What is 2+2?"
    expect:
      - type: matches
        pattern: "/2\\s*\\+\\s*2\\s*=\\s*4/"
```

### Array Length Validation (via JSON)

```yaml
tests:
  - name: "Return 3 items"
    query: "List 3 primary colors"
    config:
      response_format:
        type: json_object
    expect:
      - type: json
      - type: matches
        pattern: "red.*blue.*green|blue.*red.*green"
```

### Chaining Validations

Test intermediate steps:

```yaml
tests:
  - name: "Step-by-step validation"
    query: |
      Step 1: Name the largest planet
      Step 2: State its distance from the sun in AU
    expect:
      - type: contains
        value: "Jupiter"
      - type: matches
        pattern: "5\\.2\\d?" # ~5.2 AU
```

## Test Suite Organization

### Grouping Related Tests

```yaml
name: "Geography QA"
tests:
  - name: "Capital - France"
    query: "What is the capital of France?"
    expect:
      - type: contains
        value: "Paris"

  - name: "Capital - Japan"
    query: "What is the capital of Japan?"
    expect:
      - type: contains
        value: "Tokyo"

  - name: "Largest ocean"
    query: "What is the largest ocean?"
    expect:
      - type: contains
        value: "Pacific"
```

### Suite-Level Config with Overrides

```yaml
name: "API Tests"
config:
  model: gpt-4
  temperature: 0.3
  timeout: 30000

tests:
  - name: "Simple query"
    query: "What is 1+1?"
    expect:
      - type: contains
        value: "2"

  - name: "Complex query - longer timeout"
    query: "Explain quantum entanglement in detail"
    config:
      timeout: 60000
    expect:
      - type: latency
        maxMs: 30000
      - type: contains
        value: "entanglement"
```

## CI/CD Examples

### Simple Test Run

```bash
#!/bin/bash
export LLENS_API_KEY="${LLENS_API_KEY}"
npm run test
```

### With Reporter Options

```bash
#!/bin/bash
export LLENS_API_KEY="${LLENS_API_KEY}"
llens run --reporter spec
```

### Fail Fast in CI

```bash
#!/bin/bash
export LLENS_API_KEY="${LLENS_API_KEY}"
export LLENS_FAIL_FAST=true
llens run || exit 1
```
