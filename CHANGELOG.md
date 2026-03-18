# Changelog

## v0.1.0 — 2026-03-19

First release. Static-only structural quality analyzer for SKILL.md files.

### Added
- **Static analyzer** — `analyzeStatic(dir)` scores SKILL.md files without execution or sandboxing
- **Metrics**: `frontmatter_completeness`, `section_coverage`, `type_declaration`, `description_quality`, `interface_completeness`, `example_quality`, `composability`
- **Score + Grade** — A (0.85–1.0) through F (0.0–0.24) thresholds
- **CLI** — `npx @effectorhq/skill-eval <dir> [--static-only] [--format json]`
- **Package metadata**: `homepage`, `bugs.url`, standardized `engines.node >=18`
