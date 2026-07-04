---
name: trust-boundary-calibration
description: Maps every action the harness takes autonomously versus every action it gates behind user approval (hooks, permission settings, skill instructions, agent tool grants), finds where an agent has been handed authority it shouldn't have and where authority is being withheld out of habit or fear rather than actual risk, then redesigns the trust boundary by risk-times-leverage instead of by default caution. Use when the user asks "am I approving too much/too little", "what should really need my sign-off", "is my permission setup actually calibrated or just defaults", wants a review of hook/permission/autonomy settings, or feels like they're either rubber-stamping everything or getting asked permission for things that don't matter.
---

# Trust Boundary Calibration

Every harness draws a line: this the agent just does, this it asks first. Left alone, that line drifts toward whatever's easiest to configure rather than whatever's actually correct — broad allowlists because permission prompts got annoying, or blanket caution because one bad experience made everything feel risky. Neither is calibrated. This audit re-draws the line using two variables: how bad is it if this goes wrong, and how much does gating it actually cost.

## Step 1 — Inventory the actual boundary as configured

Read the real mechanics, not the intent:

- `~/.claude/settings.json` / `settings.local.json` — permission rules, allow/deny/ask lists, autoApprove patterns
- `~/.claude/hooks/*` — anything that blocks, warns, or auto-approves (PreToolUse hooks especially)
- Skill instructions that grant or imply autonomy ("you may X without asking", "always confirm before Y")
- Agent definitions and their tool grants (`~/.claude/agents/*`, subagent_type tool lists) — what can a spawned agent do without the user in the loop at all
- Any standing instruction like "operate autonomously" or "always ask first" at the CLAUDE.md level that overrides case-by-case judgment

Build a plain list: action type → currently autonomous or gated → by which mechanism.

## Step 2 — Score each action by risk and by leverage

Two axes, scored independently — conflating them is exactly how mis-calibration happens:

- **Risk**: if this goes wrong, how bad and how reversible? A typo in a local file is low risk (instantly fixable). A force-push, a sent email, a production deploy, a payment, a DROP TABLE, an irreversible delete — high risk, often because it's hard or impossible to undo, or because it's visible to other people.
- **Leverage**: how much value is unlocked by *not* gating this? Low-leverage gates (approving a routine `git status`, confirming a read-only lookup) cost attention for near-zero benefit. High-leverage autonomy (letting an agent run a long multi-step refactor unattended, or research and draft something without a check-in every step) saves real time *if* the risk is actually low.

Plot each action from Step 1 into a quadrant:
- **Low risk, low leverage-to-gate** → should be autonomous; gating it is pure friction bought by nothing
- **High risk, regardless of leverage** → should be gated, full stop; the potential cost of being wrong dominates
- **Low risk, high leverage-to-gate** → the interesting case — this is autonomy being withheld out of habit/fear even though little is actually at stake; find these specifically, they're the ones costing the user time for no real safety benefit
- **High risk but currently autonomous** → the dangerous case — find these with priority, they're authority an agent has that it shouldn't

## Step 3 — Name the specific miscalibrations

Two failure directions, both worth finding:

- **Authority handed out that shouldn't have been**: an agent/hook/tool grant that lets something high-risk happen without a human in the loop — look especially at subagent tool grants (an agent spawned with broad Bash access and no scope limit), auto-approve permission patterns that are broader than they need to be, or a skill instruction that says "just do it" for something genuinely hard to undo.
- **Authority withheld that's costing real time**: repeated permission prompts for actions that are low-risk and high-frequency — these train the user to blindly approve (which quietly erodes the whole gating system's value) or to avoid using a capability at all. Look for patterns in what's being asked repeatedly; if the same low-risk confirmation shows up constantly, that's evidence the gate is miscalibrated, not evidence the user needs to keep clicking approve.

## Step 4 — Redesign the boundary

For each miscalibration found, propose the specific mechanism to fix it — not just "gate this more" or "gate this less":

- Moving an action from ask to auto-allow (or vice versa) in settings.json permission rules
- Narrowing an agent's tool grant instead of removing gating entirely (e.g. read-only tools for research subagents, write access only for agents doing the actual implementation)
- Replacing a blanket rule ("always confirm before X") with a conditional one (confirm only when X targets shared/remote state, not when it's local and reversible)
- Adding a narrower hook that gates only the genuinely dangerous subset of an action instead of the whole category

## Step 5 — Report

```markdown
# Trust Boundary Calibration

## Current boundary (as configured)
[table: action → autonomous or gated → mechanism]

## Risk x Leverage map
[the four quadrants populated with actual actions from Step 1]

## Authority handed out that shouldn't have been (fix with priority)
- [action]: [why it's high risk] → [specific mechanism to add gating]

## Authority withheld that's costing time
- [action]: [evidence it's low risk / high frequency] → [specific mechanism to loosen]

## Redesigned boundary
[concrete settings.json / hook / agent-grant changes — ready to apply, pending user confirmation since this changes what the harness is allowed to do unattended]
```

Don't apply permission or hook changes without the user explicitly signing off on the redesign — this skill's output changes what future sessions are allowed to do without asking, which is exactly the kind of change that deserves a confirmed decision rather than a silent edit.
