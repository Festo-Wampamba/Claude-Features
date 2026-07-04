---
name: attack-surface-mapper
description: Maintains a running inventory (attacksurface.md) of everything the user has deployed across all projects, hosts, vendors, sites, and technologies — tech stack, hosting model, auth method, exposure audience, defenses, and known misconfiguration risks per system — and provides a separate deep-dive assessment workflow for any single system in that inventory, with a recommended testing cadence based on criticality and cost. Use when the user wants to inventory or update their overall attack surface, asks "what do I even have deployed and how exposed is it", wants a security assessment of one specific service/site/database/API, or mentions attacksurface.md directly.
---

# Attack Surface Mapper

This skill has two modes. Figure out which one the user wants before starting — "update my attack surface" or "what's deployed where" is **Maintain**; "assess X" or "how exposed is my Y" for one named system is **Assess**. If ambiguous, ask.

## Mode: Maintain (`attacksurface.md`)

Keep this as a living document at a location the user chooses (offer `~/attacksurface.md` as a sane default if they don't have a preference) — a fresh inventory pass every time is wasteful; the point is to update, not rewrite from scratch.

### Discovery

Don't rely on memory of past conversations alone — actually look:

- Local project directories (`~` and any workspace roots) — read each project's README, deployment config, `.env.example` (never the real `.env`), CI/CD config, `package.json`/`requirements.txt`/etc. for hosting/vendor clues
- Deployment platforms already connected in this harness (Vercel, Neon, any MCP server for a hosting/db/vendor product) — list actual deployed projects/databases via their tools rather than guessing
- DNS/domains the user owns, if known
- Ask the user directly for anything not discoverable from local files — self-hosted infra, third-party SaaS accounts, mobile app store listings — these leave no trace in a codebase

### For each system found, capture

```markdown
## [System name]
- **What it is**: [one line — web app / API / database / static site / mobile app / internal tool]
- **Tech stack**: [framework, language, key deps]
- **Hosting**: self-hosted (where) or third-party (which vendor)
- **Auth**: [how you log in/authenticate to manage it — and separately, how end users authenticate to it, if different]
- **Exposure**: public / internal-only / behind VPN / token-required / OAuth-gated — [be specific about audience]
- **Data sensitivity**: [what's at stake if compromised — PII, credentials, nothing sensitive, etc.]
- **Current defenses**: [WAF, rate limiting, auth method, secrets management, monitoring — whatever's actually in place]
- **Known risk class for this platform/stack**: [the common misconfigurations/CVE classes for this specific tech — e.g. exposed admin panels for X CMS, default credentials for Y self-hosted tool, IDOR patterns common to Z API framework — be specific to the actual tech, not generic OWASP boilerplate]
- **Last assessed**: [date, filled in after an Assess pass]
- **Recommended test cadence**: [see cadence guidance below]
```

### Cadence guidance

Base it on criticality × cost-to-test, not a flat schedule:
- **High criticality (holds sensitive data or is public-facing with write access) + cheap to test** (a quick automated scan, a config review) → frequent, e.g. monthly or on every deploy
- **High criticality + expensive to test** (requires manual pentesting effort) → quarterly or after significant changes, not continuously
- **Low criticality** (internal tool, no sensitive data, low blast radius) → annual or opportunistic (re-check when touched for other reasons)
- Anything newly deployed or recently changed → assess once soon after, regardless of steady-state cadence

### Update discipline

When re-running Maintain mode: diff against the existing file rather than regenerating it wholesale — flag what's new, what's changed (e.g. exposure went from internal to public), and what looks stale (a system no longer running). Don't silently drop entries for things you can't currently verify — mark them `[unverified — confirm still running]` instead of deleting.

## Mode: Assess (deep-dive on one system)

Given a specific system (named by the user, or picked from `attacksurface.md`), go deep:

1. **Confirm current state** — re-verify tech stack, hosting, auth, and exposure haven't drifted from what's recorded.
2. **Enumerate the actual surface** — for a web property: routes, forms, auth flows, file upload points, admin surfaces; for an API: endpoints, auth scheme, rate limiting, input validation; for a database: network exposure, auth method, encryption at rest/in transit, backup exposure.
3. **Check against the platform's known misconfiguration classes** from the inventory entry — research current CVEs/advisories for the specific stack/version in use if not already known.
4. **Test what's safe to test directly** (config review, header checks, auth flow walkthrough, dependency audit) and clearly flag anything that would require authorized active testing (fuzzing, exploitation attempts) as out of scope for this pass — this skill does read-only/config-level assessment, not penetration testing, unless the user explicitly frames this as an authorized pentest engagement on infrastructure they own.
5. **Report findings** ranked by severity, each with the specific misconfiguration, the exposure it creates, and a concrete fix.
6. **Update `attacksurface.md`** — set `Last assessed` to today, update any fields that changed, and note the recommended cadence going forward given what was found (an assessment that turns up real issues should shorten the next interval, not just confirm the existing one).

```markdown
# Assessment: [System name] — [date]

## Findings (ranked by severity)
- [severity] [finding]: [exposure created] → [fix]

## Confirmed unchanged from inventory
[what matched expectations]

## Drift from inventory
[what's different from what attacksurface.md recorded]

## Updated cadence recommendation
[same or changed, with reasoning]
```

Never take destructive or intrusive action against a system as part of an assessment (no active exploitation, no load testing that could cause an outage) without the user explicitly authorizing that specific action for that specific system — assessment should default to passive/config-level review.
