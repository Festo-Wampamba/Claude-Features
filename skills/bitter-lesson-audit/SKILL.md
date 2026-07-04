---
name: bitter-lesson-audit
description: Audits a Claude Code / AI coding harness against Richard Sutton's Bitter Lesson — the observation that hand-engineered rules and human-crafted special cases consistently lose to approaches that let the model's own general capability do the work, as that capability improves over time. Finds every hook, CLAUDE.md rule, skill, and workflow that hard-codes a workaround for a *current* model weakness, and flags it as technical debt that will actively hold back a future, more capable model. Produces a concrete plan to make the harness age well. Use when the user asks to review harness/config bloat, wants to know if their setup is "overengineered", asks about future-proofing their Claude Code setup, or wants a Bitter-Lesson-style critique of their tooling.
---

# Bitter Lesson Audit for Coding Harnesses

## The lesson, applied to harnesses

Sutton's essay is about AI research, but the mechanism transfers directly to harness design: **general methods that leverage computation (here: model capability) win over methods that leverage human-encoded domain knowledge, as compute/capability scales.** Chess and Go engines built on hand-crafted heuristics lost to search + learning. The same pattern shows up in coding harnesses:

- A hook that manually re-checks something the model would already get right if just asked clearly — bet against the model.
- A skill that hard-codes a 12-step procedure for a task a smarter model could figure out from a 2-sentence goal — bet against the model.
- A CLAUDE.md rule compensating for a specific model's specific blind spot (a model that used to hallucinate imports, so every skill now demands a redundant import-verification step) — bet against the model, and it becomes dead weight (or worse, active friction) the day that blind spot is fixed upstream.

None of this means "delete all structure." Some constraints are not bets against model capability — they're bets about the world staying the same regardless of model quality: security boundaries, "don't push to main without asking," "verify before claiming done." Sutton's lesson is about compensating for *reasoning/capability gaps*, not about removing judgment, taste, or safety. The audit has to tell these apart, or it'll recommend gutting the harness's actual value.

## Step 1 — Read the essay's actual argument, don't paraphrase from memory

If you have web access, fetch and (re)read Sutton's "The Bitter Lesson" (richsutton.com) before writing the audit — the essay's specific examples (chess, Go, speech recognition, computer vision) are useful anchors for the analogies you'll draw, and getting the argument slightly wrong (e.g. treating it as "just add more compute" rather than "prefer general search/learning over encoded knowledge") produces a sloppy audit.

## Step 2 — Inventory the harness with one question per component

Read `~/.claude/CLAUDE.md`, project-level `CLAUDE.md`/`AGENTS.md`, `~/.claude/settings.json`, `~/.claude/hooks/*`, `~/.claude/skills/*/SKILL.md` (and bodies for anything suspicious), `~/.claude/agents/*`.

For each component, ask: **"Is this compensating for something a smarter model wouldn't need compensating for, or is it a genuine, capability-independent constraint?"**

Sort into three buckets as you go:

1. **Capability scaffolding** (bets against the model) — rigid step-by-step procedures for tasks that are really just "use good judgment," verbose explanatory instructions for things a good model infers from a one-line goal, hard-coded lists of edge cases to check that a capable model would derive from context, workarounds phrased around a specific model's known failure mode.
2. **Durable constraints** (not bets against the model, keep regardless of capability) — security/safety rules, "ask before destructive action," style/formatting preferences that are about taste not capability, domain knowledge the model genuinely cannot infer (private API shapes, business rules, credentials handling).
3. **Ambiguous** — plausibly either; flag for the user's judgment rather than guessing.

## Step 3 — Look specifically for these failure patterns

- **Overfit to today's model**: instructions written to patch a specific, nameable weakness ("always double check X because Claude used to get this wrong") — these need an expiry condition, not permanent residence.
- **Procedural over goal-based**: skills/rules that specify *how* in exhaustive detail where specifying *what* (the success criterion) would let a better model find a better *how* on its own.
- **Redundant verification layers**: multiple hooks/rules re-verifying the same property because no one trusted the last one — a smell that trust in model capability is lower than the harness architecture assumes.
- **Brittle pattern-matching**: keyword-triggered auto-invocation rules (e.g. "if user says X, Y, or Z, do W") that will misfire or fail to fire as phrasing drifts, versus a rule that states the *goal* and trusts triggering judgment.
- **Compute-substitution-for-thought**: places where the harness throws more process (more subagents, more steps, more files) at a problem a stronger model would just solve directly.

## Step 4 — Report

```markdown
# Bitter Lesson Audit

## Summary
[2-3 sentences: how overfit is this harness to today's model, in plain terms]

## Capability scaffolding (bets against the model — will age badly)
- [component]: [what it hard-codes] → [what trusting model capability would look like instead]

## Durable constraints (keep — not bets against capability)
- [component]: [why this holds regardless of model quality]

## Ambiguous — needs your call
- [component]: [the tension, both readings]

## Upgrade plan
Ordered by leverage (highest-friction scaffolding removed first). For each:
- What to change it to (goal-stated instead of procedure-stated, where applicable)
- What would break if a much better model landed tomorrow and this stayed as-is
- Any expiry/trigger condition worth attaching (e.g. "revisit if a model release changelog mentions improved X")
```

Be concrete with examples pulled from the actual files, not generic advice — "you have scaffolding" is not a finding, "the `X` hook re-validates Y that the `Z` skill already asks the model to verify, doubling the check because neither was trusted alone" is.
