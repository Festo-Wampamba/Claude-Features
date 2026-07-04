---
name: memory-compounding-audit
description: Audits how the harness remembers across sessions (claude-mem/observations, saved context, CLAUDE.md accretion, session summaries) to find where knowledge is captured but never resurfaced, or never captured at all, then designs concrete retention/decay/promotion rules so each session compounds into the next instead of just piling up. Use when the user asks "is my memory system actually making Claude smarter about me", "why do I keep re-explaining the same thing", "what's the point of all these saved observations if nothing changes", or wants their cross-session memory/learning setup reviewed or redesigned.
---

# Memory Compounding Audit

Two systems can both "store a lot" and only one of them is learning. The difference is whether stored information changes future behavior. A pile of session observations nobody re-reads is a log, not memory. This audit's job: find out which one the user actually has, then design the mechanism that turns the pile into compounding improvement.

## Step 1 — Map what the memory system actually does, mechanically

Don't take the system's self-description at face value — trace the real path from "thing happens in a session" to "thing affects a future session."

- What captures data: hooks (SessionStart, Stop, PostToolUse), explicit `/save`-style commands, an MCP memory server (e.g. claude-mem), CLAUDE.md itself being hand-edited over time
- What's captured: raw transcripts, distilled "observations," decisions, learnings, corrections the user made
- What resurfaces it: session-start context injection, explicit search tools the model has to choose to call, or nothing (write-only)
- What decides relevance at resurface time: recency, keyword match, embedding search, manual curation, or no filter at all (dump everything)

For each capture mechanism, trace forward: pick 2-3 real entries from recent history and check whether anything downstream actually used them. If a "learning" from three weeks ago never shows up in a relevant later session, that's the core finding, not a footnote.

## Step 2 — Classify what's happening to knowledge

For a representative sample of stored memory (recent + older), sort into:

- **Compounding** — captured once, resurfaced later, changed behavior (a correction from session 3 that was respected in session 20 without re-explaining)
- **Captured but dead** — written down, never resurfaced, would have been useful if it had been (a bug pattern, a preference correction, a "don't do X again" that got repeated later anyway)
- **Never captured** — things the user had to say more than once across sessions that never made it into memory at all — this needs behavioral evidence: search for repeated corrections/questions across session history
- **Noise accumulation** — captured, technically resurfaced, but low-value (trivia that dilutes the signal without ever mattering, or a session-start context dump so large it buries anything actually useful)

## Step 3 — Diagnose the mechanism, not just the symptom

Common root causes worth checking for specifically:

- **No decay** — everything captured is treated as equally relevant forever, so old/superseded facts crowd out current ones
- **No promotion path** — a one-off observation never gets elevated into a durable rule (CLAUDE.md) even after it's proven true across many sessions; the system never "graduates" repeated learnings into standing instructions
- **Write without read incentive** — the harness is tuned to capture aggressively (because capture is cheap and visible) but nothing forces resurfacing at the right moment (because retrieval requires the model to know to look, or a context budget makes injection expensive)
- **Wrong granularity** — storing raw transcripts (expensive to resurface, low signal density) instead of distilled decisions, or storing overly-compressed summaries that lost the specific detail that would have mattered

## Step 4 — Design retention, decay, and promotion rules

Concrete, not aspirational. Propose actual mechanics:

- **Retention**: what gets captured and at what granularity (e.g. "capture decisions and corrections, not full transcripts; one line, why not what")
- **Decay**: what causes an entry's relevance to drop over time or be superseded (explicit contradiction by a newer entry, a project being marked done, simple recency half-life) — and what happens to decayed entries (archived vs. deleted vs. down-weighted in search)
- **Promotion**: the threshold and mechanism for a repeated pattern to graduate from "observation" to "standing rule" (e.g. "if the same correction shows up 3+ times across sessions, propose adding it to CLAUDE.md instead of storing it again")
- **Resurfacing**: how relevance is decided at read time — and whether it should be pulled (model searches when it judges it relevant) or pushed (injected automatically at session start based on current task) or both

## Step 5 — Report

```markdown
# Memory Compounding Audit

## Verdict
[one paragraph: is this system compounding, or just accumulating — with the specific evidence that supports the verdict]

## Compounding (working)
- [example with before/after]

## Captured but dead
- [example] — [why it never resurfaced]

## Never captured (repeated corrections found in history)
- [pattern] — [sessions where it recurred]

## Root cause
[which mechanism is actually broken: capture, decay, promotion, or resurfacing]

## Proposed rules
Concrete retention/decay/promotion design — specific enough to implement as a hook, skill instruction, or CLAUDE.md section, not just principles.
```
