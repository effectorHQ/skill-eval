---
name: linear
description: "Manage Linear issues, projects, and cycles via GraphQL API. Use when triaging backlogs, creating tasks from conversation, or checking sprint progress."
---

## Purpose

Control Linear from your AI assistant. Create issues, triage backlogs, update priorities, and run sprint reviews.

## When to Use

- Checking sprint progress mid-cycle
- Creating issues from meeting notes
- Triaging and reprioritizing a backlog

## When NOT to Use

- Complex design reviews
- GitHub PR integration (use github skill)

## Setup

1. Get Linear API key from Settings
2. Set LINEAR_API_KEY env var

## Commands

### List issues

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query": "{ viewer { assignedIssues { nodes { title } } } }"}'
```

## Examples

"What are my open Linear issues?" → Run list query

## Notes

- Rate limit: 1500 req/hr
- Use cursor pagination for large teams
