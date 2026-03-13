#!/usr/bin/env node

/**
 * skill-eval CLI — evaluate a skill directory.
 *
 * Usage:
 *   npx skill-eval ./path/to/skill [--static-only] [--format json|terminal]
 */

import { resolve } from 'node:path';
import { analyzeStatic } from '../src/static-analyzer.js';

const args = process.argv.slice(2);
const skillDir = args.find(a => !a.startsWith('-'));
const staticOnly = args.includes('--static-only');
const jsonFormat = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json';

if (!skillDir) {
  console.error('Usage: skill-eval <skill-directory> [--static-only] [--format json|terminal]');
  process.exit(1);
}

const resolved = resolve(skillDir);
const result = analyzeStatic(resolved);

if (result.error) {
  console.error(`Error: ${result.error}`);
  process.exit(1);
}

if (jsonFormat) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.grade === 'F' ? 1 : 0);
}

// Terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

const gradeColor = {
  A: GREEN, B: GREEN, C: YELLOW, D: RED, F: RED,
};

console.log(`\n${BOLD}skill-eval v0.1.0${RESET} — ${resolved}\n`);
console.log(`${BOLD}Structural Quality${RESET}`);

for (const [key, metric] of Object.entries(result.metrics)) {
  const icon = metric.score >= 0.7 ? `${GREEN}✓${RESET}` : metric.score >= 0.4 ? `${YELLOW}△${RESET}` : `${RED}✗${RESET}`;
  const name = key.replace(/_/g, ' ').padEnd(30);
  const score = metric.score.toFixed(2);
  const details = `${DIM}(${metric.details})${RESET}`;
  console.log(`  ${icon} ${name} ${score}  ${details}`);
}

const color = gradeColor[result.grade] || RESET;
console.log(`\n${'─'.repeat(42)}`);
console.log(`${BOLD}Score: ${result.score} / 1.00  →  Grade ${color}${result.grade}${RESET}`);
console.log(`${'─'.repeat(42)}\n`);

if (!staticOnly) {
  console.log(`${DIM}Functional evaluation requires --eval <file.eval.yml> (coming in v0.2.0)${RESET}\n`);
}

process.exit(result.grade === 'F' ? 1 : 0);
