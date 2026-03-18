# skill-eval

Evaluation framework for AI agent skills — measure whether capabilities actually work before they ship.

[![npm](https://img.shields.io/npm/v/@effectorhq/skill-eval?color=E03E3E&logo=npm&logoColor=white)](https://www.npmjs.com/package/@effectorhq/skill-eval) [![CI](https://github.com/effectorHQ/skill-eval/actions/workflows/test.yml/badge.svg)](https://github.com/effectorHQ/skill-eval/actions/workflows/test.yml) [![Status: Alpha](https://img.shields.io/badge/status-alpha-orange)](https://github.com/effectorHQ/REPO-TIERS.md) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## Why

ClawHub has 13,729 skills. [67% of them fail in practice](https://github.com/effectorHQ/clawhub-analysis). The ecosystem needs a way to answer: *does this skill actually do what it claims?*

`skill-eval` is a framework for writing, running, and scoring evaluations against agent skills. It draws on:

- The [ClawHub corpus analysis](https://github.com/effectorHQ/clawhub-analysis) — empirical failure patterns across 13K+ skills
- Anthropic's [skill evaluation patterns](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills) in Claude Code
- [mgechev/skill-eval](https://github.com/mgechev/skill-eval) — open-source skill assessment methodology
- The [effector-spec](https://github.com/effectorHQ/effector-spec) type system for capability interfaces

## What It Measures

### Structural Quality (static-only)

当前版本只做**静态质量评估**（不执行技能，不需要 sandbox）。主要指标来自 `src/static-analyzer.js`：

| Metric | What it checks |
|--------|----------------|
| `frontmatter_completeness` | YAML frontmatter 是否完整（name/description 等） |
| `section_coverage` | 是否覆盖核心章节（Purpose/When to Use/When NOT to Use/Setup/Commands/Examples/Notes） |
| `type_declaration` | 是否存在 `effector.toml` 且声明了 `[effector.interface]` |
| `description_quality` | 描述长度/基本可读性启发式 |
| `interface_completeness` | interface 字段的完整度（input/output/context 等） |
| `example_quality` | Examples 是否包含可用的代码块/示例 |
| `composability` | 是否使用标准类型（来自类型目录）以提升可组合性 |

### Score & Grade

Scale: 0.0 (broken) → 1.0 (production-ready). Current thresholds:

| Grade | Range | Meaning |
|-------|-------|---------|
| A | 0.85–1.00 | Production-ready, publish to ClawHub |
| B | 0.70–0.84 | Functional, needs polish |
| C | 0.50–0.69 | Partially working, significant gaps |
| D | 0.25–0.49 | Fundamentally broken |
| F | 0.00–0.24 | Non-functional |

## Directory Structure (current)

```
skill-eval/
├── src/
│   ├── index.js           # exports analyzeStatic
│   └── static-analyzer.js # structural checks (no execution)
└── scripts/
    └── run-eval.js        # CLI entry point (static-only in v0.1.x)
```

## Install

```bash
npm install @effectorhq/skill-eval
```

You can also use the CLI directly without installing globally:

```bash
npx @effectorhq/skill-eval ./my-skill
```

See the published package on npm: **https://www.npmjs.com/package/@effectorhq/skill-eval**

## Usage

```bash
# Evaluate a single skill (static-only — no execution)
npx @effectorhq/skill-eval ./path/to/skill --static-only

# Evaluate all skills in a directory
npx @effectorhq/skill-eval ./skills/ --static-only --report markdown > report.md

# JSON output for CI
npx @effectorhq/skill-eval ./path/to/skill --format json
```

### Output Example

```
skill-eval v0.1.0 — linear-skill

Structural Quality (static-only)
  ✓ frontmatter_completeness    1.00
  ✓ section_coverage            1.00
  ✓ type_declaration            1.00
  ✓ description_quality         0.90
  ✓ interface_completeness      1.00
  ✓ example_quality             0.80
  ✓ composability               0.90

──────────────────────────────────
Score: 0.97 / 1.00  →  Grade A
──────────────────────────────────
```

## Integration with effectorHQ

- **`skill-lint`** checks syntax and structure → `skill-eval` checks behavior and quality
- **`effector-audit`** can check permission drift → planned integration (not yet in v0.1.x)
- **`effector-types`** defines the type vocabulary → `skill-eval` uses the type catalog for composability checks
- **`clawhub-analysis`** provides corpus baselines → `skill-eval` grades against ecosystem norms

## Roadmap

- [x] `v0.1.x` — Static analyzer (no execution)
- [ ] `v0.2.0` — Execution sandbox (Docker-based) + functional metrics + eval file format
- [ ] `v0.3.0` — CI integration (`skill-eval-action` for GitHub Actions)
- [ ] `v0.4.0` — Batch mode for ClawHub-wide audits
- [ ] `v1.0.0` — Stable API, published to npm as `@effectorhq/skill-eval`

## Prior Art

- [mgechev/skill-eval](https://github.com/mgechev/skill-eval) — Skill evaluation methodology
- [Anthropic Claude Code Skills](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills) — Skill authoring + evaluation patterns
- [effectorHQ/clawhub-analysis](https://github.com/effectorHQ/clawhub-analysis) — Empirical data backing this framework

---

MIT License — effectorHQ Contributors
