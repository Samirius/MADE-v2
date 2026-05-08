# M1 RESEARCH — MADE

**DATE:** May 9, 2026

## 1. Competitors

### GitHub ACE (ace.githubnext.com) — PRIMARY COMPETITOR
- Cloud-only, GitHub-locked, Azure MicroVMs
- 43 API endpoints, version 0.1.53
- Channels = isolated workspaces, party members, fork with prompt
- Claude-powered AI dashboard
- Proprietary, not self-hostable
- Full ingest: ~/sabbk/projects/made/INGEST-GITHUB-ACE.md

### arpan404/ace — OPEN SOURCE ATTEMPT
- 562 commits, v0.2.0, TypeScript/Bun/Electron/Turbo monorepo
- Desktop app (macOS/Windows/Linux)
- 7 providers: Codex, Claude, Cursor, Gemini, Copilot, OpenCode, Pi
- Requires Bun + building from source
- Not Docker-friendly

### Others
- Claude Code: CLI only, no workspace
- OpenCode: CLI + TUI, no web UI
- Codex CLI: CLI only, no workspace
- Cursor: Desktop IDE, not self-hosted workspace
- Windsurf: Desktop IDE, cloud-connected

## 2. Gap — What Doesn't Exist

A self-hosted, Docker-deployable, multi-agent web workspace with:
- Chat (human conversation)
- Agent invocation (on-demand, not every message)
- Diff viewer
- Git integration
- Any provider, any agent

Nobody is doing this. ACE is cloud. arpan404/ace is desktop. CLIs are terminals.

## 3. Build vs Buy

| Component       | Build | Use Existing | Decision        |
|-----------------|-------|--------------|-----------------|
| HTTP server     | Yes   | Express      | BUILD (zero deps)|
| WebSocket       | ws    | Socket.io    | ws (lighter)    |
| Terminal        | node-pty | xterm.js  | node-pty + xterm (M2) |
| Agent adapters  | Yes   | —            | BUILD (unique)  |
| File browser    | Yes   | —            | BUILD           |
| Diff viewer     | Yes   | Monaco diff  | BUILD (simple)  |
| Auth            | Yes   | Passport     | Token env var   |

## 4. Technical Risks

| Risk                    | Likelihood | Impact | Mitigation                    |
|-------------------------|------------|--------|-------------------------------|
| Agent CLI hangs         | High       | Medium | Timeout + abort mechanism     |
| File change detection   | Medium     | Low    | Git diff after agent run      |
| WebSocket reliability   | Low        | High   | Reconnect + HTTP fallback     |
| node-pty compile fail   | Medium     | Medium | Raw spawn for M1, pty for M2  |
| Disk space (40GB)       | High       | Medium | Clean builds, no artifacts    |

## 5. Glossary

- Channel: Isolated workspace within a repo (from ACE). MADE calls these "sessions" for now.
- Party: Members with access to a channel (from ACE). MADE uses WebSocket subscribers.
- Adapter: Plugin that knows how to invoke a specific agent CLI.
- vmbridge: ACE's VM authentication layer. MADE has no VMs — uses process management.
