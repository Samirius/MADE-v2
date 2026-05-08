# ROADMAP — MADE v2

**DATE:** May 8, 2026

## Milestone 1: MVP (10-14 days)

**Goal:** A developer can connect their repo, pick an agent, prompt it, see output, review diff, commit.

### Sprint 1: Foundation (2 days)
- [ ] Initialize repo (MIT, .gitignore, .env.example)
- [ ] Server skeleton (HTTP + WebSocket)
- [ ] Session CRUD (create, list, get, delete)
- [ ] Health endpoint
- [ ] File browser (tree + file read)
- [ ] Basic frontend shell (layout, sidebar, empty states)

### Sprint 2: Agent Integration (3 days)
- [ ] Agent adapter interface (detect/start/stop)
- [ ] Hermes adapter (hermes chat -q "prompt" -Q --yolo)
- [ ] OpenCode adapter (opencode run "prompt")
- [ ] Claude adapter (claude --print "prompt")
- [ ] Codex adapter (codex "prompt" --full-auto)
- [ ] Generic adapter (python stdin script)
- [ ] Agent detection endpoint (GET /api/agents)
- [ ] WebSocket streaming (stdout/stderr → browser)
- [ ] Stop agent mid-task

### Sprint 3: Core UX (3 days)
- [ ] Onboarding flow (name input, first time)
- [ ] Session creation wizard (Name → Repo → Agent → Go)
- [ ] Agent selector UI (available/unavailable)
- [ ] Chat interface (send prompt, see messages)
- [ ] Real-time agent output (streaming cards)
- [ ] Command output cards (collapsible, exit codes)
- [ ] Agent status indicator (idle/working/error)
- [ ] NO model selector

### Sprint 4: Git + Diff (3 days)
- [ ] Git clone endpoint
- [ ] Git status display (branch, modified files)
- [ ] File change detection after agent run
- [ ] Diff viewer (added green, removed red)
- [ ] Approve/Reject changes UI
- [ ] Commit approved changes
- [ ] Session workDir validation

### Sprint 5: Ship (1-2 days)
- [x] Dockerfile + docker-compose.yml
- [x] GitHub Actions CI (lint + test)
- [x] Security hardening (CORS, path traversal, command safety)
- [x] API.md documentation
- [x] README with install guide
- [ ] Tag v0.1.0, GitHub Release

## Milestone 2: Collaboration (Post-MVP)
- Multi-user presence (see who's online)
- Session sharing (invite link)
- User avatars and colors
- Activity feed

## Milestone 3: Polish
- Arabic UI + RTL support
- Dark/light theme
- Keyboard shortcuts
- Mobile view-only mode
- One-click deploy (Railway, Fly.io)
