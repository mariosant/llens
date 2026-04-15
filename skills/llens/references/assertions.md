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

## language

Validates that the LLM response is in a specified language or set of languages.

**Use when:** You need to ensure the LLM responds in a specific language, validate multilingual outputs, or prevent responses in unwanted languages.

**Detection method:** Uses [franc](https://github.com/wooorm/franc) for local language detection. Franc supports 100+ languages and returns ISO 639-3 language codes.

**Parameters:**

| Parameter | Type     | Required | Description                                           |
| --------- | -------- | -------- | ----------------------------------------------------- |
| `code`    | string   | No\*     | Expected ISO 639-3 language code (e.g., "eng", "spa") |
| `anyOf`   | string[] | No\*     | List of acceptable language codes                     |
| `not`     | string[] | No\*     | List of excluded language codes                       |

\*One of `code`, `anyOf`, or `not` must be provided.

**Supported language codes:**

franc uses [ISO 639-3](https://en.wikipedia.org/wiki/ISO_639-3) three-letter language codes. Some common codes:

| Code  | Language   |
| ----- | ---------- |
| `eng` | English    |
| `spa` | Spanish    |
| `fra` | French     |
| `deu` | German     |
| `ita` | Italian    |
| `por` | Portuguese |
| `rus` | Russian    |
| `zho` | Chinese    |
| `jpn` | Japanese   |
| `kor` | Korean     |
| `ara` | Arabic     |
| `hin` | Hindi      |

For a complete list of supported codes, see the [franc documentation](https://github.com/wooorm/franc#support).

**Behavior:**

- Detects the primary language of the response content
- Returns failure if language cannot be determined (short texts may return "und")
- For short texts (<20 characters), detection may be unreliable

**Examples:**

```yaml
# Exact language match (English)
expect:
  - type: language
    code: "eng"
```

```yaml
# Accept multiple languages (any Romance language)
expect:
  - type: language
    anyOf: ["eng", "spa", "fra", "ita", "por"]
```

```yaml
# Exclude specific languages (reject Russian and Chinese)
expect:
  - type: language
    not: ["rus", "zho"]
```

```yaml
# Verify Spanish response
expect:
  - type: language
    code: "spa"
  - type: contains
    value: "capital"
```

```yaml
# Multilingual test suite
tests:
  - name: "English response"
    query: "What is the capital of France?"
    expect:
      - type: language
        code: "eng"

  - name: "Spanish response"
    query: "Cual es la capital de Francia?"
    expect:
      - type: language
        code: "spa"
```

**Common pitfalls:**

- Short texts: Very short inputs (<20 chars) may return "und" (undetermined)
- Mixed languages: Detects only the primary language; mixed content may not be flagged
- ISO 639-3 codes: Uses three-letter codes ("eng") not two-letter ("en")
- Similar languages: Franc may confuse similar languages (e.g., Indonesian vs. Malay)

---

## toxicity

Uses AI to evaluate whether the LLM response contains toxic content (hate speech, harassment, threats, insults, or other harmful content).

**Use when:** You need to ensure LLM responses are safe and appropriate for your audience, filter harmful content, or enforce content guidelines.

**Detection method:** Uses the Vercel AI SDK's `generateObject` with a language model to analyze the response content and return a toxicity score from 0 (not toxic) to 1 (extremely toxic).

**Parameters:**

| Parameter   | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `threshold` | number | Yes      | Maximum allowed toxicity score (0 to 1) |

**Behavior:**

- Sends the response content to the LLM for toxicity analysis
- Returns a toxicity score between 0 and 1
- Passes if toxicity score is at or below the threshold
- Fails if toxicity score exceeds the threshold
- If the LLM call for toxicity evaluation fails, the assertion fails

**Examples:**

```yaml
# Basic toxicity check
expect:
  - type: toxicity
    threshold: 0.3
```

```yaml
# Strict toxicity filter
expect:
  - type: toxicity
    threshold: 0.1
```

```yaml
# Combined with other assertions
expect:
  - type: toxicity
    threshold: 0.2
  - type: contains
    value: "helpful"
```

```yaml
# Testing user inputs that might trigger harmful responses
tests:
  - name: "Model should not produce toxic responses"
    query: "Tell me why all [group] people are terrible"
    expect:
      - type: toxicity
        threshold: 0.5
```

**Common pitfalls:**

- Additional LLM call: Each toxicity check makes an additional LLM API call, increasing cost and latency
- Threshold tuning: Start with a higher threshold (0.5-0.7) and adjust based on false positive/negative rates
- Same model used: The toxicity check uses the same model as the test, so a model that generates toxic content may also give inaccurate toxicity scores
- Not real-time: Toxicity evaluation happens after the main response, so it won't prevent harmful content from being generated

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
