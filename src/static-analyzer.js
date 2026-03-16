/**
 * Static Analyzer — structural quality checks without execution.
 *
 * Reads SKILL.md + effector.toml and produces a score across 7 metrics.
 * Zero external dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseSkillFile } from '@effectorhq/core/skill';
import { parseEffectorToml } from '@effectorhq/core/toml';

// ─── Section Detection ───────────────────────────────────

const EXPECTED_SECTIONS = [
  'Purpose', 'When to Use', 'When NOT to Use',
  'Setup', 'Commands', 'Examples', 'Notes',
];

function detectSections(body) {
  const found = [];
  for (const section of EXPECTED_SECTIONS) {
    // Match ## Purpose, ## When to Use, etc. (case insensitive)
    const pattern = new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'im');
    if (pattern.test(body)) found.push(section);
  }
  return found;
}

// ─── Metrics ─────────────────────────────────────────────

function scoreFrontmatter(fm) {
  if (!fm) return { score: 0, details: 'No frontmatter found' };

  let points = 0;
  const issues = [];

  if (fm.name) points += 0.25; else issues.push('missing name');
  if (fm.description) points += 0.25; else issues.push('missing description');
  if (fm.description?.length >= 20 && fm.description?.length <= 200) points += 0.25;
  else issues.push('description length outside 20-200 chars');

  // Check for metadata/emoji/requires (simplified)
  points += 0.25; // baseline for having frontmatter at all

  return {
    score: Math.min(points, 1),
    details: issues.length ? issues.join('; ') : 'all fields present',
  };
}

function scoreSections(body) {
  const found = detectSections(body);
  const coverage = found.length / EXPECTED_SECTIONS.length;
  const missing = EXPECTED_SECTIONS.filter(s => !found.includes(s));

  return {
    score: coverage,
    details: missing.length
      ? `${found.length}/${EXPECTED_SECTIONS.length} sections (missing: ${missing.join(', ')})`
      : `${found.length}/${EXPECTED_SECTIONS.length} sections`,
  };
}

function scoreTypeDeclaration(skillDir) {
  const tomlPath = join(skillDir, 'effector.toml');
  if (!existsSync(tomlPath)) {
    return { score: 0, details: 'no effector.toml found' };
  }

  const content = readFileSync(tomlPath, 'utf-8');
  const toml = parseEffectorToml(content);
  const iface = toml.interface;

  if (!iface.input && !iface.output) {
    return { score: 0.3, details: 'effector.toml exists but no [effector.interface] section' };
  }

  let points = 0.5; // has interface
  if (iface.input) points += 0.2;
  if (iface.output) points += 0.2;
  if (iface.context?.length) points += 0.1;

  return {
    score: points,
    details: `input=${iface.input || '?'}, output=${iface.output || '?'}, context=${iface.context?.length ? iface.context.join(',') : 'none'}`,
  };
}

function scoreDescriptionQuality(fm) {
  if (!fm?.description) return { score: 0, details: 'no description' };

  const desc = fm.description;
  let points = 0;

  if (desc.length >= 20) points += 0.3;
  if (desc.length <= 200) points += 0.2;
  if (/^[A-Z]/.test(desc)) points += 0.2;
  if (!/^(A |The |This )/.test(desc)) points += 0.15; // starts specific
  if (/\b(when|use|for|via|from)\b/i.test(desc)) points += 0.15; // action-oriented

  return {
    score: Math.min(points, 1),
    details: `${desc.length} chars, ${points >= 0.8 ? 'good' : 'needs improvement'}`,
  };
}

// ─── Enhanced Metrics (E5) ───────────────────────────────

const STANDARD_INPUT_TYPES = new Set([
  'String', 'FilePath', 'URL', 'JSON', 'RepositoryRef', 'CodeDiff',
  'CodeSnippet', 'IssueRef', 'PullRequestRef', 'CommitRef',
  'TextDocument', 'DataTable', 'ImageRef', 'PatchSet', 'StructuredData',
]);

const STANDARD_OUTPUT_TYPES = new Set([
  'Markdown', 'JSON', 'String', 'ReviewReport', 'SecurityReport',
  'Notification', 'SlackMessage', 'DiscordMessage', 'OperationStatus',
  'TestResult', 'DeploymentStatus', 'LintReport', 'Summary', 'TranslatedText',
]);

function scoreInterfaceCompleteness(skillDir) {
  const tomlPath = join(skillDir, 'effector.toml');
  if (!existsSync(tomlPath)) {
    return { score: 0, details: 'no effector.toml' };
  }

  const content = readFileSync(tomlPath, 'utf-8');
  const toml = parseEffectorToml(content);
  const iface = toml.interface;

  let points = 0;
  const present = [];

  if (iface.input) { points += 0.3; present.push('input'); }
  if (iface.output) { points += 0.3; present.push('output'); }
  if (iface.context?.length) { points += 0.2; present.push('context'); }
  if (iface.nondeterminism) { points += 0.1; present.push('nondeterminism'); }
  if (iface.idempotent !== null) { points += 0.1; present.push('idempotent'); }

  return {
    score: points,
    details: present.length ? `fields: ${present.join(', ')}` : 'no interface fields declared',
  };
}

function scoreExampleQuality(body) {
  const examplesMatch = body.match(/^##\s+Examples?\b[\s\S]*?(?=^##\s|\Z)/im);
  if (!examplesMatch) {
    return { score: 0, details: 'no Examples section' };
  }

  const section = examplesMatch[0];
  const codeBlocks = section.match(/```[\s\S]*?```/g) || [];
  let points = 0;

  if (codeBlocks.length > 0) points += 0.4;
  if (codeBlocks.length >= 2) points += 0.3;

  // Check if code blocks have real content (not just placeholders)
  const hasRealContent = codeBlocks.some(block => {
    const inner = block.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
    return inner.length > 10 && !inner.startsWith('...');
  });
  if (hasRealContent) points += 0.3;

  return {
    score: Math.min(points, 1),
    details: `${codeBlocks.length} code block(s)${hasRealContent ? ', real content' : ''}`,
  };
}

function scoreComposability(skillDir) {
  const tomlPath = join(skillDir, 'effector.toml');
  if (!existsSync(tomlPath)) {
    return { score: 0, details: 'no effector.toml — not composable' };
  }

  const content = readFileSync(tomlPath, 'utf-8');
  const toml = parseEffectorToml(content);
  const iface = toml.interface;

  let points = 0;
  const notes = [];

  if (iface.input && STANDARD_INPUT_TYPES.has(iface.input)) {
    points += 0.5;
    notes.push(`input=${iface.input} (standard)`);
  } else if (iface.input) {
    points += 0.1;
    notes.push(`input=${iface.input} (custom)`);
  }

  if (iface.output && STANDARD_OUTPUT_TYPES.has(iface.output)) {
    points += 0.5;
    notes.push(`output=${iface.output} (standard)`);
  } else if (iface.output) {
    points += 0.1;
    notes.push(`output=${iface.output} (custom)`);
  }

  return {
    score: Math.min(points, 1),
    details: notes.length ? notes.join('; ') : 'no types declared',
  };
}

// ─── Main Entry ──────────────────────────────────────────

export function analyzeStatic(skillDir) {
  const skillPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    return { error: 'SKILL.md not found', score: 0, grade: 'F', metrics: {} };
  }

  const content = readFileSync(skillPath, 'utf-8');
  const skill = parseSkillFile(content);
  const body = skill.body;
  const fm = skill.valid ? skill.parsed : null;

  const metrics = {
    frontmatter_completeness: scoreFrontmatter(fm),
    section_coverage: scoreSections(body),
    type_declaration: scoreTypeDeclaration(skillDir),
    description_quality: scoreDescriptionQuality(fm),
    interface_completeness: scoreInterfaceCompleteness(skillDir),
    example_quality: scoreExampleQuality(body),
    composability: scoreComposability(skillDir),
  };

  const weights = {
    frontmatter_completeness: 0.20,
    section_coverage: 0.20,
    type_declaration: 0.15,
    description_quality: 0.10,
    interface_completeness: 0.15,
    example_quality: 0.10,
    composability: 0.10,
  };

  let totalScore = 0;
  for (const [key, metric] of Object.entries(metrics)) {
    totalScore += metric.score * (weights[key] || 0);
  }

  const grade =
    totalScore >= 0.85 ? 'A' :
    totalScore >= 0.70 ? 'B' :
    totalScore >= 0.50 ? 'C' :
    totalScore >= 0.25 ? 'D' : 'F';

  return { score: Math.round(totalScore * 100) / 100, grade, metrics };
}
