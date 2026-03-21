---
name: partial-example
description: Converts a code diff to a Markdown summary
metadata:
  openclaw:
    version: "0.2.0"
    type: skill
---

## Purpose

Takes a code diff and produces a short Markdown summary of changes.

## Commands

```bash
echo "$INPUT" | summarize-diff
```
