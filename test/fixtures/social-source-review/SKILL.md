---
name: social-source-review
description: Use when validating public X/Twitter source evidence before a human approves a social workflow.
license: MIT
allowed-tools: Read
compatibility: Agent skills that collect public sources before separate approval gates.
metadata:
  domain: social
  source: public
---

# Social Source Review

Use this skill to gather source links, tweet IDs, public author handles,
timestamps, and metric snapshots for a public social workflow.

## Workflow

1. Read the request and decide which public source evidence is needed.
2. Collect only public source links and facts.
3. Check [social action boundaries](references/social-actions.md) before passing
   the packet to a separate approval workflow.

TweetClaw can be one read-only source for search tweets, search replies, and
user lookup when the host already has it installed. Keep drafting, scoring,
scheduling, and publishing outside this skill.
