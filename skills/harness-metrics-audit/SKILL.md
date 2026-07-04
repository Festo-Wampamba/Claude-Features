---
name: harness-metrics-audit
description: Defines what "better" actually means for the user's Claude Code harness — not vanity metrics like number of skills or lines of CLAUDE.md, but the outcome they actually care about — then designs evals and regression checks that would catch the harness getting worse before it's felt, and hunts for places a proxy metric is quietly being optimized instead of the real target. Use when the user says "I can't tell if my setup is actually helping", wants to measure harness quality, asks for regression tests on their config/hooks/skills, or suspects they're optimizing the wrong thing (e.g. more automation, more skills, faster responses) at the expense of what they actually want.
---

# Harness Metrics Audit

"More skills" and "more automation" are not outcomes — they're inputs the harness produces, and it's dangerously easy to start optimizing them because they're visible and countable while the real target (fewer redone tasks, less time to a working result, fewer surprises) is fuzzy and only felt in hindsight. This audit forces the fuzzy thing into words, then builds the tripwire that would catch drift before the user notices it themselves.

## Step 1 — Interview for the real target before proposing metrics

Don't invent "better" from the outside — ask, because it's genuinely the user's call what they're optimizing for:

- If you could feel exactly one thing improve about working with this harness in a month, what is it? (speed to a working result, fewer times you have to correct the same mistake, less time spent babysitting, higher trust to leave it unattended, something else)
- Think of the single worst session with this harness recently — what made it bad? That's usually the inverse of the real metric.
- Is there a metric you're currently tracking (skill count, automation coverage, token savings, response speed) that you suspect might be a proxy — something that goes up while the thing you actually care about doesn't, or goes down?

Get a plain-language statement of the real target before writing a single eval. If the user doesn't have a ready answer, that's fine — that's what the interview is for; don't fill the gap with an assumed default like "speed" or "correctness" without checking.

## Step 2 — Distinguish the target from its proxies

For the stated target, name the proxies currently visible in the harness (things a dashboard would show) and check whether they actually track the target:

| Proxy (easy to count) | Real target (hard to count) | Does it actually track? |
|---|---|---|
| number of skills installed | time-to-working-result | often *inversely* correlated past a point — more skills = more triggering ambiguity |
| token efficiency / caveman-mode savings | quality of outcome | can trade off directly if brevity cuts corners on safety-relevant detail |
| hooks blocking dangerous commands | fewer costly mistakes | only if they block the *right* things; false positives just train the user to route around them |
| lines of CLAUDE.md instructions | consistency of behavior | often inversely correlated — bloated files get skimmed, not followed |

Build this table for the user's actual harness and actual stated target, not the generic examples above — the generic ones are here to show the pattern of reasoning, not to be copy-pasted as findings.

## Step 3 — Design evals that catch regression on the real target

An eval here doesn't have to be a formal test suite — it needs to be something checkable, repeatable, and specific enough that "it feels worse" becomes "check X and Y."

For the stated target, propose 3-6 checks such as:
- **Behavioral regression checks**: a short set of realistic task prompts (drawn from the user's actual recent work, not generic) that should produce a specific kind of outcome — rerun periodically (e.g. after harness changes) and diff the result against a known-good baseline
- **Friction counters**: things easy to notice going up over time if tracked — number of times the user had to say "no, not like that" in a session, number of times a skill triggered when it shouldn't have (or didn't trigger when it should have), number of times a hook blocked something legitimate
- **Trust checks**: for harnesses where "I can leave this unattended longer" is the target, a check like "did an agent take an irreversible action without the expected confirmation" is a hard regression signal, not a vibe
- **Time/cost checks**: wall-clock or token cost to complete a fixed representative task, tracked over harness changes, with the explicit caveat that this only matters if it's not trading against the real target from Step 1

Make each eval concrete enough to actually run: what prompt, what output, what counts as pass/fail or better/worse. Vague evals ("check if it feels smoother") aren't evals.

## Step 4 — Report

```markdown
# Harness Metrics Audit

## The real target (in the user's words)
[plain statement]

## Proxies currently being tracked or implied by the harness
[table: proxy → real target → does it track, with evidence from the harness]

## Where drift is already visible
[any proxy currently going the "right" way while the real target evidence suggests otherwise]

## Proposed evals / regression checks
[concrete, runnable, with pass/fail criteria — organized as a short suite the user can actually execute periodically]

## Cadence
[how often to rerun these — tied to how often the harness actually changes, not an arbitrary schedule]
```
