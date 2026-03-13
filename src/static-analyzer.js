/**
 * Static Analyzer — structural quality checks without execution.
 *
 * Reads SKILL.md + effector.toml and produces a score across 6 metrics.
 * Zero external dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Frontmatter Parser ──────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  let currentKey = null;
  let currentList = null;

  for (const line of yaml.split('\n')) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Simple key: value
    const kvMatch = trimmed.match(/^(\w[\w.-]*)\s*:\s*(.+)$/);
    if (kvMatch && !trimmed.startsWith('  ')) {
      currentKey = kvMatch[1];
      currentList = null;
      let val = kvMatch[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      result[currentKey] = val;
      continue;
    }

    // List item
    if (trimmed.match(/^\s+-\s+/)) {
      const val = trimmed.replace(/^\s+-\s+/, '').trim().replace(/^"|"$/g, '');
      if (currentKey && !Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      if (currentKey) result[currentKey].push(val);
    }
  }

  return result;
}

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

// ─── TOML Parser (minimal) ───────────────────────────────

function parseTomlInterface(content) {
  const result = { hasInterface: false, input: null, output: null, context: null };

  const inputMatch = content.match(/^\s*input\s*=\s*"(.+?)"/m);
  const outputMatch = content.match(/^\s*output\s*=\s*"(.+?)"/m);
  const contextMatch = content.match(/^\s*context\s*=\s*(\[.+?\]|"(.+?)")/m);

  if (inputMatch || outputMatch) {
    result.hasInterface = true;
    result.input = inputMatch?.[1] || null;
    result.output = outputMatch?.[1] || null;
    result.context = contextMatch?.[1] || null;
  }

  return result;
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
  const iface = parseTomlInterface(content);

  if (!iface.hasInterface) {
    return { score: 0.3, details: 'effector.toml exists but no [effector.interface] section' };
  }

  let points = 0.5; // has interface
  if (iface.input) points += 0.2;
  if (iface.output) points += 0.2;
  if (iface.context) points += 0.1;

  return {
    score: points,
    details: `input=${iface.input || '?'}, output=${iface.output || '?'}, context=${iface.context || 'none'}`,
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

// ─── Main Entry ──────────────────────────────────────────

export function analyzeStatic(skillDir) {
  const skillPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    return { error: 'SKILL.md not found', score: 0, grade: 'F', metrics: {} };
  }

  const content = readFileSync(skillPath, 'utf-8');
  const fmBoundary = content.indexOf('---', 3);
  const body = fmBoundary > 0 ? content.slice(fmBoundary + 3) : content;
  const fm = parseFrontmatter(content);

  const metrics = {
    frontmatter_completeness: scoreFrontmatter(fm),
    section_coverage: scoreSections(body),
    type_declaration: scoreTypeDeclaration(skillDir),
    description_quality: scoreDescriptionQuality(fm),
  };

  const weights = {
    frontmatter_completeness: 0.30,
    section_coverage: 0.30,
    type_declaration: 0.25,
    description_quality: 0.15,
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
