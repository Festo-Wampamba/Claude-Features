---
name: harness-goal-alignment
description: Audits the user's entire Claude Code harness (system prompt behavior, CLAUDE.md/AGENTS.md files, hooks, skills, settings, agents) against a single question — what is this harness ultimately FOR — and flags every component that's actively working against that goal. If no coherent goal is stated anywhere, interviews the user to establish one before auditing. Use when the user asks things like "what am I even trying to do with this setup", "audit my harness", "does my config make sense", "why does my Claude Code feel scattered/contradictory", or wants a top-down sanity check on their configuration rather than a fix to one specific hook or skill.
---

# Harness Goal Alignment Audit

A harness accumulates parts over time — a skill added for one project, a hook copied from a blog post, a CLAUDE.md rule written in a bad mood at 2am. Each part made sense in isolation. Nobody ever checks whether they still add up to one thing. That's the job here: find the goal (or establish it), then hold every component up against it.

Do not fix anything during this pass. This is diagnosis. Fixes come after the user has seen the picture and agreed on the direction — jumping straight to edits skips the step where they get to disagree with your read of their goal.

## Step 1 — Inventory what actually exists

Read, don't assume. Skills evolve and files get edited between sessions — check current state, not memory of past sessions.

- `~/.claude/CLAUDE.md` (and any project-level `CLAUDE.md` / `AGENTS.md` in play)
- `~/.claude/settings.json` and `~/.claude/settings.local.json` — hooks, permissions, env
- `~/.claude/hooks/*` — read the actual script bodies, not just filenames
- `~/.claude/skills/*/SKILL.md` — frontmatter descriptions at minimum; open bodies for any skill that looks load-bearing or contradictory
- `~/.claude/agents/*` if present
- Any plugin marketplaces / enabled plugins referenced in settings

Build a plain list: component → what it does → what behavior it forces or nudges toward. Resist summarizing at this stage — a hook that "formats code" and a hook that "blocks all destructive git commands" belong in the same list even though one is trivia and one is a guardrail.

## Step 2 — Find or establish the goal

Look for a stated purpose: an explicit mission statement, a recurring theme across CLAUDE.md sections, a pattern in which skills got the most investment (custom scripts, evals, careful descriptions vs. one-line stubs).

If a goal is genuinely legible from the material — state it back to the user in one or two sentences and get their confirmation before treating it as ground truth. Do not silently invent a goal and grade everything against your own guess.

If no coherent goal is legible — multiple hooks pull different directions, or the harness reads like "everything I've ever wanted, layered", stop and interview. Ask things like:
- What's the one outcome that would make this setup a clear win for you in six months?
- If you could only keep a third of these skills/hooks, which third survives?
- What's this harness optimizing for — your throughput, your learning, your safety, someone else's review of your output?
- Is there a difference between what you'd *say* the goal is and what the harness actually rewards you for doing?

Don't proceed to Step 3 until the goal is stated in one or two plain sentences both of you would sign off on.

## Step 3 — Grade every component against the goal

For each item from Step 1, classify:

- **Reinforcing** — actively pushes toward the goal
- **Neutral** — doesn't matter either way, low cost to keep
- **Working against it** — this is the finding. Be specific about the mechanism: does it add friction to the thing the goal requires speed on? Does it optimize a proxy (e.g. "more tests" when the goal is "ship fast and safe")? Does it contradict another component (one hook demands confirmation, a skill instructs autonomous action in the same domain)? Does it serve a goal the user no longer has (a stale project's rules bleeding into global config)?

Contradictions between components are the highest-value findings — e.g. a global CLAUDE.md rule demanding verbose explanations sitting alongside a token-efficiency skill, or an auto-trigger rule that fires a heavyweight skill for a lightweight goal. Look for these specifically, not just per-component misalignment.

## Step 4 — Report

```markdown
# Harness Goal Alignment Audit

## The goal (as stated/established)
[one or two sentences]

## Reinforcing
- [component]: [why it helps]

## Working against the goal
- [component]: [specific mechanism of harm] — [what it costs: time, tokens, contradiction, drift]

## Contradictions between components
- [component A] vs [component B]: [how they pull in opposite directions]

## Recommendation
Ranked list of the 3-5 highest-leverage changes. Don't apply them — name them, and ask which ones the user wants actioned now vs. later.
```

Keep the report honest about severity — not everything misaligned is worth fixing. A stale skill nobody invokes is lower priority than a hook silently blocking the exact workflow the goal depends on.
