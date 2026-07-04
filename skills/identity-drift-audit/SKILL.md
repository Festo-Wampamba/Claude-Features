---
name: identity-drift-audit
description: Compares what the user's harness believes about them (identity, goals, voice, preferences — as encoded in CLAUDE.md, memory/observations, saved context, and skill configuration) against what their recent actual behavior and work reveal, then flags every place the harness is quietly optimizing for a stale, aspirational, or simply wrong version of the person. Use when the user asks "does my config still know me", "am I still that person", wants a check on whether their preferences/rules have gone stale, or says something like "update my CLAUDE.md to reflect who I actually am now" without knowing exactly what's out of date.
---

# Identity Drift Audit

Every durable preference in a harness was true the day someone wrote it down. None of them come with an expiry date. A CLAUDE.md rule that says "always give exhaustive explanations" might be a fossil from when the user was learning to code, now actively annoying someone who ships fast and wants terse output. A skill installed for a project abandoned four months ago still shapes every session. This audit finds the gap between the *modeled* user and the *current* one.

This is a diffing exercise, not a vibe check — every claim needs two sides: what the file says, and the specific evidence (a message, a file, a decision) that confirms or contradicts it.

## Step 1 — Extract every claim the harness makes about the user

Read closely and pull out explicit and implicit claims, not just headline statements:

- `~/.claude/CLAUDE.md` and any project-level `CLAUDE.md`/`AGENTS.md` — stated preferences, tone rules, workflow mandates, "always/never" statements, named tools/stacks/services
- Persistent memory / observation stores if the harness has one (claude-mem, saved context files, `~/.claude/skills/*` that encode personal facts) — read recent entries, not just the summary
- Skill and hook configuration that implies something about the user (e.g. a heavy security-review auto-trigger implies "I work with sensitive systems"; a caveman-mode hook implies "I want minimum words"; a design-system file implies "I care about visual polish")
- Any saved "about me" style content — bios, standing project descriptions, named goals

For each claim, note: what it asserts, and roughly when it was likely written (file mtime, commit history, or context in the text itself).

## Step 2 — Gather evidence of current behavior

Look at what's actually happened recently, not what was declared:

- Recent session transcripts / memory search results (mem-search, timeline tools) — what did the user actually ask for, correct, get frustrated by, or explicitly override in the last several sessions?
- Recent commits, active projects, and file activity across their working directories — what are they actually building, and does it match what CLAUDE.md says they care about?
- Places the user explicitly contradicted a stated rule in-session (e.g. asked for something the harness was configured to refuse or gate, complained about a behavior a rule mandates) — these are the strongest signal, because they're the user correcting the model in real time rather than you inferring drift.

## Step 3 — Diff claim against evidence

For every claim from Step 1, classify:

- **Confirmed** — recent behavior matches; leave alone.
- **Stale** — was true, evidence suggests it no longer is (the project it was written for is gone, the stated skill level doesn't match current work, a "learning mode" instruction persists after the user clearly isn't in learning mode anymore).
- **Aspirational** — describes who the user wants to be / wanted to be when they wrote it, not who they are in practice (e.g. a rule demanding rigorous TDD discipline that gets skipped in every real session — worth surfacing gently; this might be something they still want enforced *on them*, not necessarily a claim to delete).
- **Wrong** — actively contradicted by strong evidence, no ambiguity.
- **Unverifiable** — no evidence either way; say so rather than guessing.

Aspirational claims need care: the fix isn't always "delete it because they don't follow it" — sometimes the right read is "they know they don't follow it and want the harness to hold the line anyway." Flag the distinction and ask rather than assuming the aspiration is the error.

## Step 4 — Report

```markdown
# Identity Drift Audit

## Confirmed (still accurate)
- [claim] — [evidence]

## Stale
- [claim, source file] — [why it's stale] — [evidence of the actual current state]

## Aspirational (real question: enforce anyway, or drop?)
- [claim] — [evidence they don't follow it] — [your read on whether it's a standard they want held vs. dead weight]

## Wrong
- [claim] — [contradicting evidence]

## Proposed edits
Concrete diffs — old line → new line, or "delete this section" — not vague direction. Ask before applying; identity edits are personal enough that the user should see the exact wording before it's saved as fact about them.
```
