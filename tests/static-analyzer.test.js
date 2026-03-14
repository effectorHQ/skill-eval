/**
 * Tests for src/static-analyzer.js
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { analyzeStatic } from '../src/static-analyzer.js';

async function createTempSkill(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eval-test-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
  return dir;
}

async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

// ── Error cases ───────────────────────────────────────────

test('analyzeStatic: returns error for missing SKILL.md', async () => {
  const dir = await createTempSkill({});

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.error);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.score, 0);
  } finally {
    await cleanup(dir);
  }
});

// ── Frontmatter scoring ──────────────────────────────────

test('analyzeStatic: scores frontmatter with all fields', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: test-skill
description: "A test skill that does useful things for developers in real time"
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.frontmatter_completeness.score >= 0.75);
  } finally {
    await cleanup(dir);
  }
});

test('analyzeStatic: low score for missing frontmatter fields', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: x
---
No sections here.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.frontmatter_completeness.score <= 0.75);
  } finally {
    await cleanup(dir);
  }
});

// ── Section coverage ─────────────────────────────────────

test('analyzeStatic: full section coverage scores high', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: complete-skill
description: "A complete skill with all sections"
---
## Purpose
Test.

## When to Use
When needed.

## When NOT to Use
Never.

## Setup
Install it.

## Commands
Run it.

## Examples
Example here.

## Notes
Note here.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.strictEqual(result.metrics.section_coverage.score, 1);
  } finally {
    await cleanup(dir);
  }
});

test('analyzeStatic: missing sections reduce score', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: partial-skill
description: "A skill with few sections"
---
## Purpose
Only purpose.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.section_coverage.score < 0.5);
    assert.ok(result.metrics.section_coverage.details.includes('missing'));
  } finally {
    await cleanup(dir);
  }
});

// ── Type declaration scoring ─────────────────────────────

test('analyzeStatic: scores type declarations from effector.toml', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: typed-skill
description: "Has types"
---
## Purpose
Test.
`,
    'effector.toml': `
[effector]
name = "typed-skill"

[effector.interface]
input = "String"
output = "JSON"
context = ["GenericAPIKey"]
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.type_declaration.score >= 0.8);
    assert.ok(result.metrics.type_declaration.details.includes('String'));
  } finally {
    await cleanup(dir);
  }
});

test('analyzeStatic: no effector.toml scores zero for type_declaration', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: no-toml
description: "No toml"
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.strictEqual(result.metrics.type_declaration.score, 0);
  } finally {
    await cleanup(dir);
  }
});

// ── Description quality ──────────────────────────────────

test('analyzeStatic: good description scores high', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: good-desc
description: "Manage Linear issues via GraphQL API for sprint tracking and backlog triage"
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.description_quality.score >= 0.7);
  } finally {
    await cleanup(dir);
  }
});

test('analyzeStatic: missing description scores zero', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: no-desc
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.strictEqual(result.metrics.description_quality.score, 0);
  } finally {
    await cleanup(dir);
  }
});

// ── Grading ──────────────────────────────────────────────

test('analyzeStatic: passing fixture gets A or B', async () => {
  const fixtureDir = path.resolve(import.meta.dirname, '../fixtures/passing-skill');
  try {
    await fs.access(fixtureDir);
  } catch {
    return; // skip if fixture not present
  }

  const result = analyzeStatic(fixtureDir);
  assert.ok(['A', 'B'].includes(result.grade), `Expected A or B, got ${result.grade}`);
  assert.ok(result.score >= 0.7, `Expected score >= 0.7, got ${result.score}`);
});

test('analyzeStatic: failing fixture gets D or F', async () => {
  const fixtureDir = path.resolve(import.meta.dirname, '../fixtures/failing-skill');
  try {
    await fs.access(fixtureDir);
  } catch {
    return; // skip if fixture not present
  }

  const result = analyzeStatic(fixtureDir);
  assert.ok(['D', 'F'].includes(result.grade), `Expected D or F, got ${result.grade}`);
  assert.ok(result.score < 0.5, `Expected score < 0.5, got ${result.score}`);
});

test('analyzeStatic: linear-skill reference gets A or B', async () => {
  const linearDir = path.resolve(import.meta.dirname, '../../linear-skill');
  try {
    await fs.access(linearDir);
  } catch {
    return;
  }

  const result = analyzeStatic(linearDir);
  assert.ok(['A', 'B'].includes(result.grade), `Expected A or B, got ${result.grade}`);
});

// ── Weighted scoring ─────────────────────────────────────

test('analyzeStatic: returns score between 0 and 1', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: scored-skill
description: "Test skill"
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.score >= 0 && result.score <= 1);
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(result.grade));
  } finally {
    await cleanup(dir);
  }
});

test('analyzeStatic: has all 4 metric keys', async () => {
  const dir = await createTempSkill({
    'SKILL.md': `---
name: metric-test
description: "Test"
---
## Purpose
Test.
`,
  });

  try {
    const result = analyzeStatic(dir);
    assert.ok(result.metrics.frontmatter_completeness);
    assert.ok(result.metrics.section_coverage);
    assert.ok(result.metrics.type_declaration);
    assert.ok(result.metrics.description_quality);
  } finally {
    await cleanup(dir);
  }
});
