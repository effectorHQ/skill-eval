# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · [Semantic Versioning](https://semver.org/)

---

## [0.1.0] — 2026-03-19

First release. Published as `@effectorhq/skill-eval`.

### Added
- **Static analyzer** — `analyzeStatic(dir)` scores SKILL.md files without execution or sandboxing
- **7 metrics**:
  - `frontmatter_completeness` — required fields present (`name`, `description`, `version`, `type`)
  - `section_coverage` — standard sections present (Purpose, When to Use, When NOT to Use, Setup, Examples)
  - `type_declaration` — `[effector.interface]` input/output types declared
  - `description_quality` — description length and informativeness
  - `interface_completeness` — context types, nondeterminism, idempotent flags declared
  - `example_quality` — examples section has structured input/output pairs
  - `composability` — types are standard Effector types (from the 36-type catalog)
- **Score + Grade system** — weighted score 0.0–1.0 mapped to A (≥0.85) through F (<0.25)
- **CLI** — `npx @effectorhq/skill-eval <dir> [--static-only] [--format json]`
- Zero dependencies — Node.js built-ins only
- Depends on `@effectorhq/core ^1.0.0` for type catalog
- 14 tests
