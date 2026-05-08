# RESEARCH — MADE v2

**DATE:** May 8, 2026

## 1. Existing Solution Audit

### 1. Claude Code (Anthropic)
- **URL:** claude.ai/code
- **What:** Terminal-based AI coding agent. Reads codebase, edits files, runs commands.
- **Why not fit:** Single agent (Claude only). No collaboration. No web UI. Cloud-dependent (requires Anthropic API). Not self-hosted. No repo connection beyond local git.
- **Does well:** Best-in-class code understanding. Multi-file edits. Permission system. Streaming output.
- **Price:** $20/month (Pro) or API usage

### 2. OpenCode (opencode-ai)
- **URL:** github.com/opencode-ai/opencode
- **What:** Terminal TUI for AI coding. Multi-provider (OpenAI, Anthropic, Google, local).
- **Why not fit:** Terminal-only. No web UI. No collaboration. No repo browser. Single user. No diff review before commit.
- **Does well:** Multi-provider. TUI is polished. ACP protocol for structured agent communication. Open source.
- **Price:** Free OSS, bring your own API key

### 3. Codex CLI (OpenAI)
- **URL:** github.com/openai/codex
- **What:** Terminal AI agent. Autonomous coding with sandboxed execution.
- **Why not fit:** Single agent (OpenAI only). No web UI. No collaboration. Cloud-dependent. No diff review.
- **Does well:** Sandboxed execution (--full-auto mode). Clean CLI interface. Autonomous.
- **Price:** Free CLI, requires OpenAI API key

### 4. Cursor
- **URL:** cursor.com
- **What:** AI-native IDE (fork of VS Code). Inline edits, chat, multi-file changes.
- **Why not fit:** Desktop app only. Not self-hosted. Proprietary. Single-user. IDE-centric, not workspace-centric.
- **Does well:** Best AI editing UX. Inline diffs. Tab completion. Multi-file awareness.
- **Price:** Free tier, $20/month Pro

### 5. Devin / Factory.ai
- **URL:** devin.ai, factory.ai
- **What:** Autonomous AI software engineer. Cloud-based. Full development environment.
- **Why not fit:** Closed source. $500/month. Cloud-only (can't self-host). No user control over agent. No multi-agent.
- **Does well:** End-to-end autonomous. Handles complex multi-step tasks. Built-in browser, terminal, editor.
- **Price:** $500/month (Devin), enterprise (Factory)

### 6. Aider
- **URL:** aider.chat
- **What:** Terminal AI pair programmer. Multi-file edits with git integration.
- **Why not fit:** Terminal-only. No web UI. No collaboration. Single LLM at a time. No diff review UI.
- **Does well:** Git-native (auto-commits with meaningful messages). Multi-file edits. Supports many LLMs. Open source.
- **Price:** Free OSS, bring your own API key

### 7. Continue.dev
- **URL:** continue.dev
- **What:** VS Code / JetBrains extension. AI chat + inline edits + agent mode.
- **Why not fit:** IDE extension, not workspace. No collaboration. No web UI. Not standalone.
- **Does well:** IDE-integrated UX. Multi-provider. Open source. Configurable.
- **Price:** Free OSS

### 8. Goose (Block/Square)
- **URL:** github.com/block/goose
- **What:** Autonomous AI coding agent. Extensible with plugins.
- **Why not fit:** Terminal-only. No web UI. No collaboration. Single agent.
- **Does well:** Plugin architecture. Tool extensibility. Open source. Semi-autonomous.
- **Price:** Free OSS

### 9. SWE-agent (Princeton)
- **URL:** github.com/princeton-nlp/SWE-agent
- **What:** Research agent for solving GitHub issues autonomously.
- **Why not fit:** Research tool, not dev workspace. No real-time interaction. No collaboration. Designed for benchmarks.
- **Does well:** Autonomous issue solving. High success rate on SWE-bench.
- **Price:** Free OSS

### 10. GitHub Copilot Workspace
- **URL:** github.com
- **What:** Web-based AI coding environment integrated with GitHub issues/PRs.
- **Why not fit:** GitHub-locked. Not self-hosted. Limited agent control. Not multi-agent.
- **Does well:** Deep GitHub integration. Issue → code → PR flow. Web-based (no install).
- **Price:** Included with GitHub Copilot ($10-39/month)

### 11. bolt.new / lovable.dev / v0.dev
- **URL:** bolt.new, lovable.dev, v0.dev
- **What:** Web-based AI app builders. Prompt → full app.
- **Why not fit:** Cloud-only. Not self-hosted. Not for existing codebases. Toy/demo generators, not real dev tools.
- **Does well:** Instant prototyping. Non-technical users can generate apps. Web preview.
- **Price:** Freemium

### Build vs Buy Decision

```
OPTION A: Fork OpenCode and add web UI
  - Time: 3-4 weeks to add web layer
  - Risk: OpenCode is Go+React, our stack is Node.js+vanilla JS
  - Control: Shared with OpenCode maintainers
  - Community: Would need to upstream or maintain fork

OPTION B: Build from scratch (using MADE v1 as foundation)
  - Time: 2 weeks to MVP
  - Risk: We already proved the engine works in v1
  - Control: Full control
  - Foundation: Reuse adapters, server architecture, WebSocket layer

DECISION: OPTION B — Build from scratch
REASON: MADE v1 proved the engine. The problem was UX/product, not architecture.
We already have working adapters for Hermes, OpenCode, Claude, Codex.
Starting fresh with v2 lets us get the product flow RIGHT without legacy baggage.
Reuse the adapter code, rewrite the UI and onboarding.
```

## 2. Technical Feasibility

```
CAPABILITY:           Multi-agent CLI integration
REQUIRED TECH:        child_process.spawn, PTY (node-pty)
DOES IT EXIST?        Yes — proven in MADE v1
COMPLEXITY:           Medium (streaming output, exit codes, error handling)
VERIFIED:             Hermes + OpenCode tested and working

CAPABILITY:           Real-time WebSocket collaboration
REQUIRED TECH:        ws (npm package)
DOES IT EXIST?        Yes — proven in MADE v1
COMPLEXITY:           Low

CAPABILITY:           Git provider integration
REQUIRED TECH:        HTTPS API (GitHub, GitLab, Bitbucket, Gitea)
DOES IT EXIST?        Yes — all have REST APIs with token auth
COMPLEXITY:           Low-Medium (OAuth flow for GitHub, token for others)

CAPABILITY:           Diff viewing in browser
REQUIRED TECH:        diff library + syntax highlighting
DOES IT EXIST?        Yes — diff2html, Monaco diff editor, or custom
COMPLEXITY:           Low

CAPABILITY:           File browser for repo
REQUIRED TECH:        Server-side directory listing + file reading
DOES IT EXIST?        Yes — proven in MADE v1
COMPLEXITY:           Low

CAPABILITY:           Docker self-hosting
REQUIRED TECH:        Dockerfile with node-pty native deps
DOES IT EXIST?        Yes — proven in MADE v1 (S3 sprint)
COMPLEXITY:           Low (already solved)

CAPABILITY:           PTY terminal in browser
REQUIRED TECH:        xterm.js + node-pty WebSocket bridge
DOES IT EXIST?        Yes — standard pattern
COMPLEXITY:           Medium (made harder by needing to share PTY across viewers)
```

## 3. Risk Identification

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Agent CLI changes break adapter (e.g., hermes updates remove -q flag) | M | H | Pin adapter versions, add integration tests per agent |
| 2 | WebSocket scaling (many sessions = many connections) | L | M | Start with single-server. Add Redis pub/sub later if needed |
| 3 | Security: agent executes destructive commands on user's repo | H | H | Sandbox option, command safety filter, user confirmation for rm/sudo |
| 4 | Git provider API rate limits | L | L | Cache aggressively, use conditional requests |
| 5 | Scope creep (trying to become IDE) | H | M | Strict "workspace not IDE" rule. No file editing UI, no syntax editor |
| 6 | User can't set up Docker on their machine | M | M | Offer one-click deploy templates (Railway, Fly.io, Render) |
| 7 | Disk space on dev machine (40GB, always full) | H | L | Keep deps minimal. No node_modules bloat. Clean regularly. |

## 4. Domain Glossary

```
TERM             DEFINITION
───────────────  ──────────────────────────────────────────────
Workspace        The web UI where all interaction happens
Session          A single agent interaction context (repo + agent + history)
Agent            A CLI tool that edits code (Hermes, Claude Code, OpenCode, Codex)
Adapter          MADE's connector to a specific agent CLI
Provider         A git hosting service (GitHub, GitLab, Bitbucket, Gitea)
Adapter CLI      The command MADE runs to invoke an agent (e.g., "hermes chat -q")
Collaborator     Another user viewing/interacting with the same session
Diff             The file changes an agent made during a session
Review           User approving or rejecting agent changes before commit
Stream           Real-time output from an agent (stdout/stderr)
PTY              Pseudo-terminal — lets MADE capture interactive CLI output
```

## 5. Dependency Inventory

```
DEPENDENCY        TYPE          CRITICAL?   ALTERNATIVE IF IT DIES
────────────────  ────────────  ──────────  ────────────────────────
ws                WebSocket     Yes         uWebSockets.js, sockjs
node-pty          Terminal      Yes         node-pty-prebuilt, xterm.js server
xterm.js          UI Terminal   No          Raw pre + code blocks
GitHub API        Git Provider  No          GitLab, Gitea, local-only
Hermes CLI        Agent         No          OpenCode, Claude, Codex, Generic
highlight.js      Syntax HL     No          Prism, Shiki, Monaco
diff2html         Diff Viewer   No         Custom diff renderer, Monaco
```

## Gate Questions

1. **3 existing solutions + why they don't fit?** YES — listed 11 tools above.
2. **Build vs buy decision?** YES — Build, reusing v1 engine.
3. **All critical capabilities verified?** YES — all proven in v1.
4. **Top 5 risks identified?** YES — 7 risks with mitigations.
5. **Domain glossary started?** YES — 10 terms defined.

**VERDICT: PROCEED** ✓
