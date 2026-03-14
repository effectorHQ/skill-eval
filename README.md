# skill-eval

Evaluation framework for AI agent skills — measure whether capabilities actually work before they ship.

[![Status: Alpha](https://img.shields.io/badge/status-alpha-orange)](https://github.com/effectorHQ/REPO-TIERS.md) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## Why

ClawHub has 13,729 skills. [67% of them fail in practice](https://github.com/effectorHQ/clawhub-analysis). The ecosystem needs a way to answer: *does this skill actually do what it claims?*

`skill-eval` is a framework for writing, running, and scoring evaluations against agent skills. It draws on:

- The [ClawHub corpus analysis](https://github.com/effectorHQ/clawhub-analysis) — empirical failure patterns across 13K+ skills
- Anthropic's [skill evaluation patterns](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills) in Claude Code
- [mgechev/skill-eval](https://github.com/mgechev/skill-eval) — open-source skill assessment methodology
- The [effector-spec](https://github.com/effectorHQ/effector-spec) type system for capability interfaces

## What It Measures

### Structural Quality (static, no execution)

| Metric | What it checks | Weight |
|--------|---------------|--------|
| `frontmatter_completeness` | All required YAML fields present and valid | 0.15 |
| `section_coverage` | Purpose, When to Use, When NOT to Use, Setup, Commands, Examples, Notes | 0.15 |
| `type_declaration` | Has `effector.toml` with `[effector.interface]` input/output/context | 0.10 |
| `permission_alignment` | Declared permissions match detected behavior (via `effector-audit`) | 0.10 |
| `description_quality` | Length, specificity, starts with verb, avoids vague language | 0.05 |
| `install_completeness` | At least one install method with all required fields | 0.05 |

### Functional Quality (requires execution sandbox)

| Metric | What it checks | Weight |
|--------|---------------|--------|
| `prerequisite_resolution` | All declared `requires.bins` and `requires.env` resolve | 0.10 |
| `invocation_success` | Skill produces parseable output for a reference input | 0.15 |
| `output_type_match` | Actual output matches declared output type shape | 0.10 |
| `error_handling` | Graceful behavior on invalid input (no crash, clear message) | 0.05 |

### Composite Score

```
score = Σ(metric_score × weight)
```

Scale: 0.0 (broken) → 1.0 (production-ready). Thresholds:

| Grade | Range | Meaning |
|-------|-------|---------|
| A | 0.85–1.00 | Production-ready, publish to ClawHub |
| B | 0.70–0.84 | Functional, needs polish |
| C | 0.50–0.69 | Partially working, significant gaps |
| D | 0.25–0.49 | Fundamentally broken |
| F | 0.00–0.24 | Non-functional |

## Eval File Format

Evals are YAML files describing expected behavior:

```yaml
# evals/linear.eval.yml
skill: linear
version: ">=1.0.0"

prerequisites:
  env:
    - LINEAR_API_KEY
  bins:
    - curl
    - jq

cases:
  - name: list-open-issues
    input: "What are my open Linear issues?"
    expect:
      output_type: JSON
      contains_fields: ["id", "title", "state"]
      no_error: true

  - name: create-issue
    input: "Create a Linear issue titled 'Test from skill-eval'"
    expect:
      output_type: JSON
      contains_fields: ["id", "identifier"]
      no_error: true
    teardown: "Delete the created issue"

  - name: invalid-key
    input: "List my issues"
    env_override:
      LINEAR_API_KEY: "invalid_key"
    expect:
      no_crash: true
      error_message_contains: ["unauthorized", "401", "invalid"]

scoring:
  pass_threshold: 0.70
  weights:
    invocation_success: 0.4
    output_type_match: 0.3
    error_handling: 0.2
    prerequisite_resolution: 0.1
```

## Directory Structure

```
skill-eval/
├── src/
│   ├── runner.js          # Eval execution engine
│   ├── scorer.js          # Metric computation + grading
│   ├── reporter.js        # Output formatting (terminal, JSON, markdown)
│   └── static-analyzer.js # Structural quality checks (no execution)
├── evals/
│   ├── linear.eval.yml    # Reference eval for linear-skill
│   └── README.md          # How to write evals
├── fixtures/
│   ├── passing-skill/     # A skill that scores A
│   └── failing-skill/     # A skill that scores F (for testing the framework)
├── scripts/
│   └── run-eval.js        # CLI entry point
├── package.json
└── README.md
```

## Usage

```bash
# Evaluate a single skill (structural only — no execution)
npx skill-eval ./path/to/skill --static-only

# Evaluate with execution (requires sandbox + prerequisites)
npx skill-eval ./path/to/skill --eval evals/linear.eval.yml

# Evaluate all skills in a directory
npx skill-eval ./skills/ --static-only --report markdown > report.md

# JSON output for CI
npx skill-eval ./path/to/skill --format json
```

### Output Example

```
skill-eval v0.1.0 — linear-skill

Structural Quality
  ✓ frontmatter_completeness    1.00  (all fields present)
  ✓ section_coverage            1.00  (7/7 sections)
  ✓ type_declaration            1.00  (effector.toml with typed interface)
  ✓ permission_alignment        1.00  (no drift detected)
  ✓ description_quality         0.90  (good length, specific)
  ✓ install_completeness        1.00  (manual install with steps)

Functional Quality
  ✓ prerequisite_resolution     1.00  (curl, jq found; LINEAR_API_KEY set)
  ✓ invocation_success          1.00  (3/3 cases passed)
  ✓ output_type_match           1.00  (JSON output matches declaration)
  ✓ error_handling              0.80  (graceful on invalid key, no crash)

──────────────────────────────────
Score: 0.97 / 1.00  →  Grade A
──────────────────────────────────
```

## Integration with effectorHQ

- **`skill-lint`** checks syntax and structure → `skill-eval` checks behavior and quality
- **`effector-audit`** checks permission drift → `skill-eval` uses that as one metric
- **`effector-types`** defines the type vocabulary → `skill-eval` checks output against declared types
- **`clawhub-analysis`** provides corpus baselines → `skill-eval` grades against ecosystem norms

## Roadmap

- [ ] `v0.1.0` — Static analyzer + reference eval for `linear-skill`
- [ ] `v0.2.0` — Execution sandbox (Docker-based) + functional metrics
- [ ] `v0.3.0` — CI integration (`skill-eval-action` for GitHub Actions)
- [ ] `v0.4.0` — Batch mode for ClawHub-wide audits
- [ ] `v1.0.0` — Stable API, published to npm as `@effectorhq/skill-eval`

## Prior Art

- [mgechev/skill-eval](https://github.com/mgechev/skill-eval) — Skill evaluation methodology
- [Anthropic Claude Code Skills](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills) — Skill authoring + evaluation patterns
- [OpenClaw SKILL.md spec](https://github.com/openclaw/openclaw) — The skill format this evaluates
- [effectorHQ/clawhub-analysis](https://github.com/effectorHQ/clawhub-analysis) — Empirical data backing this framework

---

MIT License — effectorHQ Contributors
