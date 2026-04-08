# Assertion Types Reference

Detailed documentation for all assertion types available in llens.

## contains

Checks if the LLM response contains a specific substring.

**Use when:** You want to verify the response includes certain text, keywords, or phrases.

**Parameters:**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `value`   | string | Yes      | The substring to look for |

**Behavior:**

- Case-sensitive substring match
- Matches anywhere in the response
- Returns pass if found, fail if not found

**Examples:**

```yaml
# Basic text validation
expect:
  - type: contains
    value: "Paris"
```

```yaml
# Multiple contains assertions (all must pass)
expect:
  - type: contains
    value: "capital"
  - type: contains
    value: "France"
```

```yaml
# Verify technical term is present
expect:
  - type: contains
    value: "quantum entanglement"
```

**Common pitfalls:**

- Case sensitivity: "paris" won't match "Paris" - use `matches` with case-insensitive flag for case-insensitive matching
- Partial matches: "Paris" will match "The capital of France is Paris"

---

## matches

Validates the response against a regular expression pattern.

**Use when:** You need flexible pattern matching, format validation, or case-insensitive matching.

**Parameters:**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `pattern` | string | Yes      | Regex pattern (supports `/pattern/flags` notation) |

**Pattern notation:**

- Plain regex: `\\d{4}-\\d{2}-\\d{2}` (escaped backslashes in YAML)
- Slash notation: `/\\d{4}-\\d{2}-\\d{2}/i` (includes flags after closing `/`)

**Supported regex flags:**

- `i` - Case insensitive
- `g` - Global (find all matches)
- `m` - Multiline

**Examples:**

```yaml
# Date format validation (ISO 8601)
expect:
  - type: matches
    pattern: "\\d{4}-\\d{2}-\\d{2}"
```

```yaml
# Case-insensitive email format check
expect:
  - type: matches
    pattern: "/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i"
```

```yaml
# URL validation
expect:
  - type: matches
    pattern: "https?://[\\w.-]+(?:/[\\w./-]*)?"
```

```yaml
# Phone number format (US)
expect:
  - type: matches
    pattern: "/\\(?\\d{3}\\)?[-\\s.]?\\d{3}[-\\s.]?\\d{4}/"
```

```yaml
# Match multiple occurrences with global flag
expect:
  - type: matches
    pattern: "/error:\\s*([^\\n]+)/g"
```

**Common pitfalls:**

- YAML escaping: In YAML, `\` must be escaped as `\\`. Use single-quoted strings or slash notation to reduce escaping
- greedy matching: `.*` is greedy and may over-match - use `.*?` for non-greedy
- Complex patterns: For complex regex, test in a regex debugger first

---

## json

Validates that the response is valid JSON.

**Use when:** You want to ensure the LLM returns parseable JSON regardless of content.

**Parameters:** None

**Behavior:**

- Attempts to parse response as JSON
- Passes if valid JSON, fails if invalid
- Does not validate structure (use `schema` for that)

**Examples:**

```yaml
# Basic JSON validation
expect:
  - type: json
```

```yaml
# Often paired with schema validation
expect:
  - type: json # First ensure it's valid JSON
  - type: schema # Then validate structure
    schema:
      type: object
      properties:
        name:
          type: string
```

```yaml
# JSON array validation
expect:
  - type: json
```

**Common pitfalls:**

- JSON with leading/trailing whitespace: Usually handled automatically
- Markdown code blocks: If LLM returns `json ... `, the json assertion will fail - consider using `matches` to extract JSON first, or instruct the LLM to return raw JSON
- Very large JSON: No size limit enforced

---

## schema

Validates that the response is valid JSON and matches a JSON Schema structure.

**Use when:** You need to verify the LLM returns properly structured data with expected fields and types.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `schema`  | object | Yes      | JSON Schema definition |

**Supported JSON Schema types:**

- `string` - Validated via Zod `z.string()`
- `number` - Validated via Zod `z.number()`
- `boolean` - Validated via Zod `z.boolean()`
- `array` - Validated via Zod `z.array(z.unknown())`
- `object` - Validated via Zod `z.record(z.string(), z.unknown())`

**Schema properties:**

| Property     | Type   | Required | Description                                                  |
| ------------ | ------ | -------- | ------------------------------------------------------------ |
| `type`       | string | Yes      | JSON type (`object`, `string`, `number`, `boolean`, `array`) |
| `properties` | object | No       | Field definitions (for objects)                              |
| `required`   | array  | No       | Required field names (for objects)                           |

**Examples:**

```yaml
# Simple object with required fields
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
        - age
```

```yaml
# Nested structure
expect:
  - type: schema
    schema:
      type: object
      properties:
        user:
          type: object
          properties:
            firstName:
              type: string
            lastName:
              type: string
        active:
          type: boolean
      required:
        - user
        - active
```

```yaml
# Array of objects
expect:
  - type: schema
    schema:
      type: array
```

```yaml
# Multiple field types with optional fields
expect:
  - type: schema
    schema:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        role:
          type: string
      required:
        - id
```

**Common pitfalls:**

- Response must be valid JSON first - schema validation fails if JSON is malformed
- Type coercion: "123" (string) won't pass `type: number` validation - ensure LLM returns proper types
- Missing optional fields: Only required fields are enforced

---

## cost

Checks token usage against configured limits.

**Use when:** You want to enforce cost budgets or prevent verbose responses.

**Parameters:**

| Parameter   | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| `maxTokens` | number | No       | Maximum total tokens allowed                                |
| `maxCost`   | number | No       | (Currently unused but available for future pricing support) |

**Behavior:**

- Only checks if response includes usage data from the LLM API
- Passes automatically if no usage data available and no limits set
- Fails if total tokens exceed `maxTokens`

**Examples:**

```yaml
# Limit response length
expect:
  - type: cost
    maxTokens: 500
```

```yaml
# Tight budget for simple responses
expect:
  - type: cost
    maxTokens: 50
```

```yaml
# Combined with other assertions
expect:
  - type: contains
    value: "answer"
  - type: cost
    maxTokens: 200
```

**Common pitfalls:**

- Token counting depends on LLM API response - not all providers return usage data
- Total tokens = prompt tokens + completion tokens (exact behavior varies by provider)
- Without limits set, assertion passes if usage data is unavailable

---

## latency

Validates that the LLM response completes within a time limit.

**Use when:** You need to enforce response time requirements for real-time applications.

**Parameters:**

| Parameter | Type   | Required | Description                                   |
| --------- | ------ | -------- | --------------------------------------------- |
| `maxMs`   | number | Yes      | Maximum allowed response time in milliseconds |

**Behavior:**

- Measures time from request start to response completion
- Independent of LLM API timing accuracy
- Applies per-test, not cumulative

**Examples:**

```yaml
# 2 second limit
expect:
  - type: latency
    maxMs: 2000
```

```yaml
# Fast response required
expect:
  - type: latency
    maxMs: 1000
```

```yaml
# Generous limit for complex tasks
expect:
  - type: latency
    maxMs: 30000
```

```yaml
# Combined performance assertions
expect:
  - type: latency
    maxMs: 5000
  - type: cost
    maxTokens: 1000
```

**Common pitfalls:**

- Network latency included: Measures end-to-end time including network round-trips
- Provider variability: LLM APIs can have variable latency - set realistic limits
- Cold starts: Some providers have higher latency on first request

---

## Combining Assertions

Multiple assertions can be combined in a single test. All must pass for the test to succeed.

```yaml
tests:
  - name: "Comprehensive validation"
    query: "Explain quantum computing"
    expect:
      - type: contains
        value: "quantum"
      - type: matches
        pattern: "\\d" # Contains at least one number
      - type: latency
        maxMs: 10000
      - type: cost
        maxTokens: 500
```
