# Global Design Principles
Always adhere to the design system defined in `~/design.md` when creating or modifying user interfaces. This file contains the "Linear Global Design" standard, which favors a dark-canvas aesthetic with specific typography and component rules. Use the tokens and component specs defined in that file for all UI-related tasks.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

## Auto-trigger rules (no manual invocation needed)

Automatically invoke `skill: "graphify"` (WITHOUT waiting for the user to type `/graphify`) whenever:
- User asks a question about a codebase, project structure, or how code is connected/organized
- User asks "what does this project do?", "explain the codebase", "how does X relate to Y?"
- User starts working in a directory that has a `graphify-out/` folder — treat all questions as graphify queries
- User asks to analyze, understand, or navigate any folder of code or documents
- User asks about dependencies, relationships, or architecture in a project

If `graphify-out/` already exists in the current project, always use the cached graph first (run with `--update` flag to refresh).

# remotion-best-practices
- **remotion-best-practices** (`~/.claude/skills/remotion/SKILL.md`) - Remotion video creation in React. Source: https://github.com/remotion-dev/skills

## Auto-trigger rules (MANDATORY — no manual invocation needed)

Automatically invoke `skill: "remotion-best-practices"` via the Skill tool BEFORE any work involving Remotion. No need for user to ask.

Triggers:
- Any mention of Remotion, `@remotion/*` packages, `remotion.config.ts`, `<Composition>`, `useCurrentFrame`, `interpolate`, `Sequence`, `AbsoluteFill`
- User asks to create, edit, render, or debug a programmatic video, animation, intro, outro, captions, transitions, audio visualization, Lottie, or MP4/GIF/WebM output
- Working in a folder with `remotion.config.ts`, `src/Root.tsx`, or `@remotion/*` in `package.json`
- Scaffolding a new video project (`create-video`, `npx remotion`)
- Editing TSX files inside a Remotion project's `src/` (Composition/Sequence/animation code)
- Tasks about: frames, fps, durationInFrames, timing, easing, sequencing, audio sync, video duration extraction, subtitles, SRT, voiceover, FFmpeg pipelines in a Remotion context

Skill content lives in `~/.claude/skills/remotion/` with rule files under `rules/` (3d, audio, captions, charts, fonts, lottie, sequencing, transitions, etc.). Load specific rule files when the task touches that domain.

# andrej-karpathy-skills (karpathy-guidelines)
- **karpathy-guidelines** - Behavioral guidelines derived from Andrej Karpathy's observations on LLM coding pitfalls.

## Auto-trigger rules (MANDATORY — no manual invocation needed)

You MUST automatically invoke `skill: "andrej-karpathy-skills:karpathy-guidelines"` via the Skill tool BEFORE writing, editing, reviewing, or refactoring ANY code. No exceptions.

Triggers:
- Any coding task: writing new code, editing existing code, fixing bugs, refactoring
- Code review or analysis requests
- Any task where you will produce or modify source files
- Before making implementation decisions or architectural choices

The skill enforces four principles: Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution. Always apply these — they override default behavior.

## gstack

Always use the /browse skill from gstack for all web browsing.
Never use mcp__claude-in-chrome__* tools directly.

Load gstack skills on every session start. If this is a new feature, suggest /office-hours first.
If uncommitted changes exist, suggest /review before /ship.

### Sprint Workflow
New feature: /office-hours → /autoplan → [build] → /review → /qa → /cso → /ship → /land-and-deploy → /retro

## Global Design Skill Stack

When the task involves UI, UX, frontend polish, web layout, motion, typography, spacing, design critique, or visual quality:
- Use **Impeccable** for structured design workflows, audits, polish, critique, layout, animation, responsiveness, and finishing passes. Invoke via `skill: "impeccable"`.
- Use **Emil Kowalski's skill** (`skill: "emil-design-eng"`) for interaction feel, motion quality, design sensitivity, and UI craft.
- Use **animation-vocabulary** (`skill: "animation-vocabulary"`) when naming or describing motion effects.
- Use **review-animations** (`skill: "review-animations"`) when reviewing animation quality against standards.
- Use **taste-skill** (`skill: "taste-skill"`) when output risks becoming generic, repetitive, template-like, or AI-looking.
- Use **redesign-skill** (`skill: "redesign-skill"`) when upgrading an existing design to premium quality.
- Use **soft-skill** (`skill: "soft-skill"`) when the design needs to feel expensive/high-end agency quality.
- Use **minimalist-skill** (`skill: "minimalist-skill"`) for clean editorial-style interfaces.
- Use **brutalist-skill** (`skill: "brutalist-skill"`) for data-heavy, raw mechanical interfaces.
- Use **stitch-skill** (`skill: "stitch-skill"`) when generating design system files (DESIGN.md).
- Use **brandkit** (`skill: "brandkit"`) for brand identity, logo systems, and visual world presentations.
- Use **image-to-code-skill** (`skill: "image-to-code-skill"`) when implementing a design from an image reference.
- Use **output-skill** (`skill: "output-skill"`) to enforce complete untruncated code generation.

### Preferred workflow order
1. **Taste Skill** early — set visual direction, avoid generic output
2. **Emil Kowalski / animation-vocabulary** — during implementation and motion refinement
3. **Impeccable** — critique, audit, polish, harden before shipping

Do not apply all skills simultaneously to the same component. Use the minimum skill that matches the task.

## dotclaude Hooks & Automation

Global hooks are active on every session. Respect them — do not try to bypass them.

### Active hooks
- **Auto-Format** (PostToolUse Edit|Write): formats on save via Prettier/Ruff/gofmt/Biome — report results, don't re-run manually
- **Auto-Test** (PostToolUse Edit|Write): runs the matching test file — report results
- **protect-files** (PreToolUse Edit|Write): blocks edits to .env, secrets, lockfiles, .git/, hooks themselves
- **scan-secrets** (PreToolUse Edit|Write): blocks hardcoded credentials in written content
- **block-dangerous-commands** (PreToolUse Bash): blocks rm -rf ~, force push to main, DROP TABLE without WHERE, curl|bash, chmod 777
- **notify** (Notification): fires desktop notification when Claude needs attention
- **session-start** (SessionStart startup|resume): injects git context — branch, uncommitted files, staged diff, PR info
- **compact-reminder** (SessionStart compact): injects operating instructions after context compaction

### Available dotclaude agents (invoke with @name)
- @code-reviewer, @security-reviewer, @performance-reviewer, @doc-reviewer
- @frontend-designer, @pr-test-analyzer, @silent-failure-hunter

### Operating rules
- Use pnpm, not npm, for all Node.js operations
- Run tests before finishing major changes
- Never edit .env, .env.*, or secrets/ without explicit user confirmation
- When inside a git worktree, preserve branch isolation — never assume sibling changes exist locally
- Rely on hook results for formatting/test feedback rather than re-running

## Portability
This setup is versioned at: https://github.com/festo-dev/claude-features
To restore on a new machine: `bash <(curl -fsSL https://raw.githubusercontent.com/festo-dev/claude-features/main/install.sh)`
