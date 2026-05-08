# PROJECT BRIEF — MADE v2

**DATE:** May 8, 2026

## PROBLEM

Developers use AI coding agents (Claude Code, OpenCode, Codex, Hermes) in isolated 
terminal windows. There is no workspace that lets you:

1. Connect YOUR repo (GitHub/GitLab/Bitbucket/Gitea or local)
2. Pick ANY agent (not locked to one vendor)
3. See what the agent is doing in real-time (file changes, terminal output, reasoning)
4. Collaborate with teammates watching the same session
5. Review agent changes before committing (not blind auto-commit)

Current alternatives solve parts of this:
- Claude Code: single agent, no collaboration, no workspace UI
- Cursor/Copilot: IDE plugins, not multi-agent, not self-hosted
- OpenAI Codex: cloud-only, single agent, no self-host
- Factory.com / Devin: closed source, SaaS-only, $500/month
- Existing MADE v1: built the engine but not the product (UX broken, no onboarding)

## WHO HAS THIS PROBLEM

**Primary:** Solo developers and small teams (1-5) who use AI coding agents daily 
and want a unified workspace instead of juggling terminal windows.

**Secondary:** Engineering leads who want to see what AI agents are doing to their 
codebase (auditability, oversight).

## SUCCESS METRIC

A developer can:
1. Open MADE → authenticate → connect their GitHub repo → pick an agent → 
   send a prompt → see the agent working in real-time → review the diff → 
   approve or reject changes
2. All of this in under 2 minutes from first visit to first prompt
3. Self-hosted on a $5/month VPS

## CONSTRAINTS

- Budget: bootstrap (zero hosting cost for dev, $5-20/month VPS for production)
- Timeline: MVP in 2 weeks
- Team: solo (Samir + Hermes)
- Deployment: Docker, self-hosted, single binary/container
- Stack: Node.js (already proven in v1) + vanilla HTML/CSS/JS (no framework)
- Region: Global OSS, but MENA-first design (RTL-ready, Arabic UI option)
- Disk: 40GB server, chronically tight — no heavy dependencies

## OUT OF SCOPE (MVP)

- No mobile app
- No IDE integration (VS Code plugin etc.)
- No billing/subscription system
- No multi-repo in one session
- No agent-to-agent orchestration (one agent at a time per session)
- No video/audio
- No desktop app (browser only)
- No AI model hosting (agents bring their own models)

## KILL CRITERIA

- If no developer in Samir's network wants to self-host this after seeing a demo
- If it requires more than 2GB RAM to run
- If the onboarding flow takes more than 2 minutes for a new user
- If we can't support at least 2 different agent CLIs

## RISK LEVEL

**MVP** — Ship to users, validate, iterate.

## PRODUCT TYPE

Web App — browser-based workspace, WebSocket real-time, Docker deployment.

## TEAM SIZE

Solo (Samir + Hermes)

## DATA SENSITIVITY

**MEDIUM** — Repos contain source code (intellectual property), agent tokens 
(API keys), git provider tokens. No financial/health data. 
T6 Legal + T12 Security at FULL attention.

## CONTRACT TYPE

N/A — own product, open source.

## STAKEHOLDER

Self — solo dev, own product.

## LICENSE

MIT — most permissive, encourages adoption and contribution.

## EXISTING RESOURCES

- MADE v1 at github.com/Samirius/MADE (engine works, UX broken)
- Agent adapters: Hermes, OpenCode, Claude, Codex (written, partially working)
- Server: Node.js 22, vanilla HTML/CSS/JS, WebSocket, 2 npm deps
- Research: Context Forge ACE paper studied, Maggie Appleton demo analyzed
- Sabbk workspace: ~/sabbk/ with goals, issues, project tracking
- This server: 40GB disk, Node.js 22, Hermes gateway running

## LANGUAGE / LOCALE

- Primary UI: English (global OSS)
- Arabic UI: Phase 2+ (not MVP, but CSS must be RTL-ready)
- RTL layout: not in MVP, but no hardcoding that breaks RTL later

## GO/NO-GO GATE

1. **Problem in one sentence?** 
   YES → "Developers need a self-hosted workspace to use any AI coding agent 
   on their repos with real-time visibility and team collaboration."

2. **Know the user?** 
   YES → Developers who use AI coding agents daily and want a unified workspace.

3. **Know what "done" looks like?** 
   YES → Connect repo → pick agent → prompt → see work → review diff → approve.

4. **Sabbk Test (real problem)?** 
   YES → Today they juggle terminal windows with no visibility or collaboration. 
   Factory/Devin charge $500/month and are cloud-only. Self-hosted alternative 
   doesn't exist at this quality level.
   3 people who'd use it: Samir, any Sabbk client with dev team, OSS contributors.

5. **Worth time right now?** 
   YES → Sabbk's differentiation is AI+software. A flagship OSS tool proves 
   capability and builds reputation. Better than another CRUD app.

6. **Contribute vs Build?** 
   NO existing OSS does this specific thing (multi-agent, self-hosted workspace 
   with real-time UI). Closest is OpenCode's TUI but it's single-agent, terminal-only.
   Building is justified.

**VERDICT: GO** ✓
