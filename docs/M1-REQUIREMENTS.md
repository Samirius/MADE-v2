# M1 REQUIREMENTS — MADE

**DATE:** May 9, 2026  
**SCOPE:** Milestone 1 — self-hosted multi-agent workspace MVP

---

## REQ-001: Docker Deploy
AS A developer  
I NEED to run `docker compose up` and have MADE running  
SO THAT I can start using it in 60 seconds without configuring anything.

Acceptance:
- [ ] `docker compose up` starts the server
- [ ] Server responds on port 3100 within 30 seconds
- [ ] Browser opens to a working UI
- [ ] No manual npm install, node version management, or config

Priority: P0  
Effort: 2h

---

## REQ-002: Identify User
AS A developer  
I NEED to set my name once  
SO THAT my messages and agent runs are attributed to me.

Acceptance:
- [ ] First visit shows name prompt (stored in localStorage)
- [ ] Name appears on all my messages
- [ ] Name persists across page refreshes
- [ ] Can change name from sidebar

Priority: P0  
Effort: 1h

---

## REQ-003: Create Session
AS A developer  
I NEED to create a new workspace session  
SO THAT I can work on a specific project or task.

Acceptance:
- [ ] "New Session" button opens creation form
- [ ] Can name the session
- [ ] Can point to a local directory (project path)
- [ ] Can pick an agent (Hermes, OpenCode, etc.)
- [ ] Agent list shows which agents are available on this machine
- [ ] Invalid paths show error (not silently fail)
- [ ] Session appears in sidebar immediately

Priority: P0  
Effort: 3h

---

## REQ-004: Chat Messages
AS A developer  
I NEED to send chat messages in a session  
SO THAT I can communicate with teammates without triggering the agent.

Acceptance:
- [ ] Chat input sends a human message (no agent)
- [ ] Messages show sender name + timestamp
- [ ] Messages appear for all connected users via WebSocket
- [ ] Chat history loads on session select
- [ ] Can send multiple messages without refreshing

Priority: P0  
Effort: 2h

---

## REQ-005: Run Agent
AS A developer  
I NEED to trigger the agent on demand with a specific prompt  
SO THAT the agent works on exactly what I want, not every message.

Acceptance:
- [ ] Separate "Run Agent" button + input bar
- [ ] Agent dropdown shows available agents
- [ ] Clicking "Run Agent" starts the selected agent
- [ ] Agent output streams in real-time via WebSocket
- [ ] "Stop" button kills the running agent
- [ ] After agent completes, can run again without refreshing
- [ ] Exit code shown (success/fail badge)

Priority: P0  
Effort: 4h

---

## REQ-006: Agent Adapters
AS A developer  
I NEED MADE to work with multiple coding agent CLIs  
SO THAT I can use my preferred agent.

Acceptance:
- [ ] Hermes adapter: `hermes chat -q "prompt" -Q --yolo`
- [ ] OpenCode adapter: `opencode run "prompt"` or ACP
- [ ] Claude adapter: `claude --print "prompt"`
- [ ] Codex adapter: `codex "prompt"`
- [ ] Generic adapter: direct API call for custom agents
- [ ] Each adapter manages its own process lifecycle
- [ ] Auto-detection: server checks which agents are installed

Priority: P0  
Effort: 3h

---

## REQ-007: File Browser
AS A developer  
I NEED to browse the project directory  
SO THAT I can see the file structure the agent is working with.

Acceptance:
- [ ] Right panel shows directory tree
- [ ] Clicking a file shows its contents
- [ ] Can navigate into subdirectories
- [ ] Binary files show "(binary)" not garbage
- [ ] Invalid path shows clear error

Priority: P1  
Effort: 2h

---

## REQ-008: Diff Viewer
AS A developer  
I NEED to see what files the agent changed  
SO THAT I can review before committing.

Acceptance:
- [ ] After agent run, "Changes" tab shows modified files
- [ ] Clicking a file shows green/red diff lines
- [ ] Can approve or discard individual changes
- [ ] Approving stages the file for commit

Priority: P1  
Effort: 3h

---

## REQ-009: Git Integration
AS A developer  
I NEED to commit agent changes  
SO THAT the work is saved in version control.

Acceptance:
- [ ] Git status shows after agent run
- [ ] Can write commit message and commit from UI
- [ ] Commit uses correct author name
- [ ] Error if not a git repo

Priority: P1  
Effort: 2h

---

## REQ-010: Session Management
AS A developer  
I NEED to switch between sessions  
SO THAT I can work on multiple projects.

Acceptance:
- [ ] Sidebar lists all sessions
- [ ] Clicking a session loads its chat + files
- [ ] Can delete old sessions
- [ ] Active session is highlighted

Priority: P1  
Effort: 1h

---

## REQ-011: Real-time Multi-user
AS A team member  
I NEED to see teammates' messages and agent output in real-time  
SO THAT we can collaborate without screen sharing.

Acceptance:
- [ ] WebSocket broadcasts chat messages to all connected clients
- [ ] Agent output streams to all connected clients
- [ ] Multiple browser tabs can connect simultaneously
- [ ] Disconnection shows warning, not silent failure

Priority: P1  
Effort: 2h

---

## REQ-012: Security Basics
AS A developer  
I NEED basic security  
SO THAT random people can't access my workspace.

Acceptance:
- [ ] Token auth via MADE_TOKEN env var (optional for dev)
- [ ] Path traversal protection on file endpoints
- [ ] Command injection protection on agent prompts
- [ ] CORS restricted to configured origin
- [ ] No credentials in client-side code

Priority: P0  
Effort: 3h

---

## REQ-013: Responsive UI
AS A developer  
I NEED a clean workspace layout  
SO THAT I can focus on coding, not fighting the UI.

Acceptance:
- [ ] Dark theme by default
- [ ] Three-panel layout: sidebar | chat | files/diff
- [ ] All panels properly styled (no broken CSS)
- [ ] All buttons work (no dead onclick)
- [ ] Empty states show helpful text, not blank areas

Priority: P0  
Effort: 4h

---

## Summary

| Priority | Count | Requirements                    |
|----------|-------|---------------------------------|
| P0       | 6     | Deploy, Auth, Session, Chat, Agent, Security, UI |
| P1       | 6     | Files, Diff, Git, Sessions, Multi-user, UX       |

Total: 13 requirements  
Estimated: ~32 hours (1 person, 1 week focused work)

## What We Already Have (from v0.1.0)

| Req     | Status      | Notes                                |
|---------|-------------|--------------------------------------|
| REQ-001 | Partial     | Dockerfile exists, not tested clean  |
| REQ-002 | Partial     | Name prompt exists, buggy            |
| REQ-003 | Partial     | Creation form exists, needs testing  |
| REQ-004 | Partial     | Chat input added but untested        |
| REQ-005 | Partial     | Agent run added but buggy            |
| REQ-006 | Done        | 5 adapters written and syntax-clean  |
| REQ-007 | Partial     | File tree exists, needs testing      |
| REQ-008 | Partial     | Diff viewer added but untested       |
| REQ-009 | Partial     | Git status/commit exists             |
| REQ-010 | Partial     | Session list in sidebar              |
| REQ-011 | Partial     | WS broadcasting works                |
| REQ-012 | Partial     | Path traversal + CORS exists         |
| REQ-013 | Broken      | CSS was rewritten, needs full test   |

**Verdict:** Code exists for all 13 requirements but NOTHING has been end-to-end tested with a real browser. We need a proper QA pass (Phase 9).
