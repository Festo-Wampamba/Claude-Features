---
name: custom-goals
description: Turns a stated goal ("ship X", "get Y working", "clean up Z") into a tracked task list with explicit, checkable completion criteria per task, then verifies each criterion before marking it done rather than taking self-reported completion at face value. Use when the user states a goal or objective for a session/feature, asks to "track this goal", "make sure everything is completed", "did we finish X", or wants goal-driven execution instead of an open-ended TODO list.
---

# Custom Goals

Turns a goal into tasks you can actually check off — not "I think this is done" but "here is the command/observation that proves it."

Most task lists rot because "done" is never defined precisely enough to verify later. This skill forces a verification criterion into existence at task-creation time, before doing the work, so completion is checked instead of assumed. This mirrors the karpathy-guidelines "goal-driven execution" principle — apply this skill to turn that principle into an actual list with actual checks.

## Step 1 — Restate the goal as a single sentence

If the user's goal is vague ("clean this up", "make it work"), restate your interpretation in one sentence and confirm before proceeding. Do not silently guess scope.

## Step 2 — Break the goal into tasks with a verification criterion each

For every task, write down *before* starting work:

- **What**: the concrete change
- **Verify**: the exact command, test, or observable behavior that proves it's done — not "looks right" but something runnable or checkable (a test passing, a build succeeding, a specific output value, a page rendering a specific element)

Use TaskCreate for each item, putting the verification criterion in the task description, not just the title. A task without a stated verification criterion is not ready to start — write the criterion first.

Reject criteria that can't fail: "review the code" is not a criterion, "grep confirms zero remaining references to X" is.

## Step 3 — Work the list, verify before closing

For each task:
1. Mark in_progress (TaskUpdate).
2. Do the work.
3. Run the exact verification from Step 2 — don't skip it, don't substitute a weaker check.
4. Only mark completed if verification actually passed. If it didn't, the task stays open and the failure gets noted — don't mark done and mention the issue in prose instead.

## Step 4 — Final sweep before declaring the goal done

Before telling the user the goal is complete:
- Re-list all tasks (TaskList) — confirm none are still pending or in_progress.
- Re-run any verification that's cheap to re-check in aggregate (full test suite, build) rather than trusting the per-task checks in isolation — integration issues between tasks don't show up per-task.
- Report which criteria were verified and how, not just "everything's done."

If a task can't be verified (no test exists, no observable output), say so explicitly rather than marking it complete anyway — an unverifiable task is a finding, not a checkbox.
