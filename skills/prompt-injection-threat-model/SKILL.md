---
name: prompt-injection-threat-model
description: Maps every input channel into the harness (user prompts, tool/command output, fetched web content, MCP server responses, file contents, subagent outputs, hook output, memory/context injection) and assesses how vulnerable each one is to prompt injection given the actual models and tools in play, then researches current defense techniques and produces a concrete long-term hardening plan. Use when the user asks how vulnerable their setup is to prompt injection, wants a security review of tool/data inputs into Claude, asks about indirect prompt injection from web content or MCP servers, or wants a plan to harden the harness against injected instructions.
---

# Prompt Injection Threat Model

Prompt injection isn't one vulnerability — it's a property of every channel that puts untrusted text where the model reads it as context. A harness with a dozen tools, several MCP servers, and web-fetch capability has a dozen-plus distinct attack surfaces, each with a different trust level, different blast radius if compromised, and different mitigations available. Treat this as a per-channel threat model, not a single yes/no verdict.

## Step 1 — Enumerate every input channel

Go through the harness systematically and list every path through which text can reach the model's context that the model will treat as instructions or trusted data:

- **Direct user prompts** — highest trust by design, but still worth noting if the harness treats *pasted* content (e.g. "here's an error log, fix it") with the same trust as the user's own words
- **Tool/command output** (Bash results, file reads) — trusted as data, but a file the model reads could itself contain injected instructions (a malicious comment in a README, a crafted commit message, a poisoned config file)
- **Web-fetched content** (WebFetch, WebSearch, any firecrawl/tavily-style MCP tool, browser automation reading page text) — the highest-risk channel by default: arbitrary third-party text, often rendered specifically to be read by an LLM, landing directly in context
- **MCP server responses** — each connected server (check the current session's MCP list) is a distinct trust boundary; a compromised or malicious MCP server can return content designed to look like legitimate tool output
- **Subagent outputs** — a subagent that itself fetched untrusted content (web, files) can pass injected instructions up to the orchestrating agent as if they were its own findings, laundering the injection through a trust boundary
- **Hook output / stdout injected as context** (session-start hooks, PostToolUse feedback) — if any hook pulls in dynamic external content (an API call, a scraped value) before injecting it as "system" context, that's a channel too
- **Memory/observation injection** (claude-mem or similar) — if past session content is later resurfaced as trusted context, and that past content included something injected during a prior session, injection can persist and resurface across sessions
- **Browser automation page content** (claude-in-chrome, playwright, chrome-devtools style tools) — page text, console logs, and DOM content are attacker-controlled if the page is

For each channel found in *this specific harness* (don't assume channels exist — check actual settings/MCP config/installed tools), note: what model(s) process it (the main session model vs. a subagent's model, if different), and whether the content is summarized/transformed before reaching the primary model (transformation can either reduce or launder risk depending on what does the transforming).

## Step 2 — Assess each channel's exposure

For each channel, score:

- **Trust boundary crossed**: does this channel bring in content from a party who could plausibly want to manipulate the agent (any third party on the open web, any external file the user didn't author, any MCP server not under the user's control)?
- **Injection surface size**: how much raw untrusted text lands in context verbatim vs. how much is constrained/validated/structured (e.g. a tool that returns a typed JSON field is lower-surface than one that returns freeform scraped text)
- **Blast radius if the injection succeeds**: what could an attacker achieve if their injected text is treated as an instruction? Tie this directly to the trust-boundary/tool-grant audit — a channel that feeds into an agent with broad Bash/write access or ability to push code/send messages is much higher stakes than one feeding a read-only research agent
- **Existing mitigation, if any**: does anything already reduce this (a hook that flags suspicious content, a system prompt instruction to treat fetched content as data not instructions, a subagent boundary that limits what gets passed back up)?

## Step 3 — Research current defenses

Before recommending anything, check current best practice rather than working from stale assumptions — prompt injection defense is an active area and techniques/guidance from model providers change:
- Anthropic's own guidance on tool use safety and prompt injection (check current docs)
- Known patterns: content-vs-instruction delimiting/tagging (marking fetched content clearly as data, as this harness's own tool results already do with `<system-reminder>`-style tagging — note whether that pattern is used consistently across all channels found in Step 1 or only some), spotlighting/marking untrusted spans, privilege separation between agents that read untrusted content and agents that can take consequential action, output filtering, human-confirmation gates specifically for the step *after* untrusted content was read and *before* a consequential action executes
- Any published tooling for injection detection/scanning relevant to the harness's actual stack

## Step 4 — Report and long-term plan

```markdown
# Prompt Injection Threat Model

## Input channel map
[table: channel → model(s) processing it → trust boundary crossed → injection surface size → existing mitigation]

## Highest-risk channels (ranked)
[channel: why — tie explicitly to blast radius, i.e. what tool/agent access sits downstream of this channel]

## Current defenses already in place
[what's already helping, even if not designed for this purpose]

## Gaps
[specific channels with high exposure and low/no mitigation]

## Recommendation — near-term
[concrete, applicable now: tagging conventions, agent privilege separation, confirmation gates after untrusted-content reads before consequential actions]

## Recommendation — long-term
[architecture-level: e.g. dedicated low-privilege agents for any task that touches untrusted web/MCP content, systematic content/instruction separation across all tools, periodic re-audit cadence as new tools/MCP servers get added]
```

Keep the plan proportionate — not every channel needs the same defense, and treating a read-only research subagent with the same suspicion as a write-capable production agent will just make the harness unusable without adding real safety where it matters.
