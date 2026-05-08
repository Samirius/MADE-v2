# PROJECT BRIEF — MADE M1

**DATE:** May 9, 2026

## PROBLEM

Developers use AI coding agents (Claude Code, Hermes, OpenCode, Codex) in isolated
terminals. There's no self-hosted workspace that lets them connect a repo, pick any
agent, chat with their team, run the agent on demand, review changes, and commit —
all in one browser tab.

GitHub is building ACE (ace.githubnext.com) for this — but it's cloud-only,
GitHub-locked, and requires Azure MicroVMs. Developers who want self-hosted,
any-provider, run-on-your-own-machine have no option.

## WHO HAS THIS PROBLEM

Solo developers and small teams (1-5) who:
- Use multiple AI coding agents and switch between them
- Want agent output visible to the whole team, not buried in one person's terminal
- Self-host their tools (compliance, cost, or preference)
- Don't want to be locked into GitHub or any single provider

## SUCCESS METRIC

A developer can:
1. `docker compose up` and have MADE running in 60 seconds
2. Connect their local repo, pick Hermes as agent
3. Chat with teammate, then run agent on a task
4. See agent output stream in real-time
5. Review file changes in a diff viewer
6. Commit the changes
— All without leaving the browser tab.

M1 success = 1 developer (Samir) completes all 6 steps without hitting a bug.

## CONSTRAINTS

- Budget: $0. Bootstrap. Self-hosted.
- Timeline: M1 in 2 weeks (May 9 - May 23, 2026)
- Team: Solo, AI-assisted
- Deployment: Docker on any Linux box, VPS, or localhost
- Region: Global (English UI, no regional constraints)

## OUT OF SCOPE (M1)

- No GitHub OAuth (token auth for MVP)
- No MicroVM sandboxing (runs on user's machine, they trust it)
- No mobile app
- No desktop app (browser only)
- No multi-language / RTL
- No billing / payments
- No AI dashboard (Claude summaries — M2)
- No issue/PR linking (M2)
- No channel fork (M2)
- No SSH terminal in browser (M2)

## KILL CRITERIA

- If self-hosted Docker deploy doesn't work cleanly on a fresh Ubuntu box
- If agent integration only works with 1 agent (need at least 2)
- If Samir can't complete the 6 success steps without bugs
- If M1 takes >4 weeks

## RISK LEVEL

MVP — Ship to ourselves first, validate, iterate.

## PRODUCT TYPE

Web App (browser-based workspace)

## TEAM SIZE

Solo — no PRs, self-review, AI-assisted code review

## DATA SENSITIVITY

MEDIUM — repo source code viewed through workspace. No credentials stored
beyond API tokens in env vars. Triggers T12 standard security review.

## CONTRACT TYPE

N/A (own product, open source)

## STAKEHOLDER

Self (Samir) — Sabbk product

## LICENSE

MIT — open source, community-building strategy

## EXISTING RESOURCES

- Repo: github.com/Samirius/MADE-v2 (v0.1.0 tagged, code exists but buggy)
- Previous attempt: MADE v1 at github.com/Samirius/MADE (abandoned, broken architecture)
- Research: ~/sabbk/projects/made/INGEST-GITHUB-ACE.md (GitHub ACE analysis)
- Engineering Gate skill: v8.4 (pipeline to follow)
- Machine: 40GB disk (tight), Node.js 22, Hermes CLI installed

## COMPETITIVE POSITION

| Aspect          | GitHub ACE              | MADE M1                 |
|-----------------|-------------------------|-------------------------|
| Hosting         | Cloud (Azure)           | Self-hosted (Docker)    |
| Auth            | GitHub OAuth            | Token env var           |
| Repo            | GitHub only             | Any local directory     |
| VM              | MicroVM per channel     | None (user's machine)   |
| Multi-user      | Party members           | Chat via WebSocket      |
| Agents          | (unknown)               | Hermes + OpenCode + any |
| Source          | Proprietary             | MIT open source         |

MADE's edge: Self-hosted. Simple. Open. Runs anywhere.

## GATE CHECK

1. Problem in one sentence? YES — "No self-hosted multi-agent coding workspace exists."
2. User defined? YES — "Solo devs and small teams who self-host."
3. Done is measurable? YES — "6 steps completed bug-free."
4. Real problem? YES — GitHub is building ACE for it (validates market). Samir needs it himself.
5. Worth time? YES — Sabbk product, portfolio piece, skill development.
6. Contribute instead? NO — ACE is proprietary, no self-hosted alternative exists.

Result: PASS. Proceed to Phase 1.
