# REQUIREMENTS — MADE v2

**DATE:** May 8, 2026  
**SCOPE:** MVP (Milestone 1)

---

## Functional Requirements

### REQ-001: User Authentication
AS A developer  
I NEED to identify myself with a name and optional avatar  
SO THAT collaborators can see who is in the workspace  

ACCEPTANCE:
  - [ ] First visit shows a welcome screen asking for name
  - [ ] Name is persisted in localStorage (no server account needed for MVP)
  - [ ] Name appears in collaboration indicators
  - [ ] No email/password required (single-user self-hosted MVP)

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Functional

### REQ-002: Git Repository Connection
AS A developer  
I NEED to connect to my git repository  
SO THAT agents can work on my actual codebase  

ACCEPTANCE:
  - [ ] Can select "Local directory" and enter an absolute path
  - [ ] Can select "Clone from URL" and enter a git URL + optional token
  - [ ] Can select "Fresh project" to create a new empty repo
  - [ ] Server validates the path/URL before creating the session
  - [ ] Error message if path doesn't exist or URL is invalid
  - [ ] Session workDir is set to the connected repo

PRIORITY: Must | COMPLEXITY: M | CATEGORY: Functional

### REQ-003: Agent Selection
AS A developer  
I NEED to pick which AI coding agent to use  
SO THAT I can use the agent I prefer for this task  

ACCEPTANCE:
  - [ ] UI shows detected agents (green = available, gray = not installed)
  - [ ] Can select one agent as the active agent for the session
  - [ ] Agent list comes from server detection (not hardcoded)
  - [ ] Selecting an agent shows: name, CLI command, and detected status
  - [ ] NO model selector (model = agent's own concern)

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Functional

### REQ-004: Prompt an Agent
AS A developer  
I NEED to send a prompt to the selected agent  
SO THAT the agent starts working on my task  

ACCEPTANCE:
  - [ ] Chat input at bottom of workspace
  - [ ] Send prompt via Enter key or send button
  - [ ] Prompt appears in chat as user message
  - [ ] Agent starts processing immediately
  - [ ] Agent status changes from "idle" to "working"

PRIORITY: Must | COMPLEXITY: M | CATEGORY: Functional

### REQ-005: Real-time Agent Output
AS A developer  
I NEED to see what the agent is doing in real-time  
SO THAT I can monitor progress and catch issues early  

ACCEPTANCE:
  - [ ] Agent stdout streams into chat as it arrives
  - [ ] Agent stderr streams into chat (visually distinct)
  - [ ] Agent status shows: thinking / running command / editing file / done
  - [ ] "Stop" button to kill the agent mid-task
  - [ ] Agent completion shows exit code (success/failure)

PRIORITY: Must | COMPLEXITY: L | CATEGORY: Functional

### REQ-006: File Change Visualization
AS A developer  
I NEED to see which files the agent changed  
SO THAT I can review the diff before committing  

ACCEPTANCE:
  - [ ] Changed files listed in sidebar after agent completes
  - [ ] Click a file to see the diff (added lines green, removed red)
  - [ ] Diff shows file path, line numbers, and content
  - [ ] "Approve" and "Reject" buttons per file or for all changes
  - [ ] Approved changes are committed to git

PRIORITY: Must | COMPLEXITY: L | CATEGORY: Functional

### REQ-007: File Browser
AS A developer  
I NEED to browse my project files  
SO THAT I can see the repo structure and read any file  

ACCEPTANCE:
  - [ ] Tree view of project directory in sidebar
  - [ ] Click a file to view its contents
  - [ ] Syntax highlighting for code files
  - [ ] Folder expand/collapse
  - [ ] Shows file size

PRIORITY: Must | COMPLEXITY: M | CATEGORY: Functional

### REQ-008: Terminal Output Log
AS A developer  
I NEED to see the commands the agent ran  
SO THAT I understand what it did  

ACCEPTANCE:
  - [ ] Terminal commands shown in a collapsible card
  - [ ] Command output (stdout) shown below command
  - [ ] Exit code visible (green for 0, red for non-zero)
  - [ ] Long outputs collapsed with "show more" toggle

PRIORITY: Should | COMPLEXITY: M | CATEGORY: Functional

### REQ-009: Session Management
AS A developer  
I NEED to see my sessions and switch between them  
SO THAT I can work on multiple tasks  

ACCEPTANCE:
  - [ ] Sidebar lists all sessions with name + agent + timestamp
  - [ ] Click session to switch to it
  - [ ] Can delete a session
  - [ ] Session persists across page refresh (server-side state)

PRIORITY: Must | COMPLEXITY: M | CATEGORY: Functional

### REQ-010: Git Status Display
AS A developer  
I NEED to see the current git status of my repo  
SO THAT I know what branch I'm on and what's changed  

ACCEPTANCE:
  - [ ] Shows current branch name
  - [ ] Shows number of modified/untracked files
  - [ ] Shows last commit message
  - [ ] Updates after agent makes changes

PRIORITY: Should | COMPLEXITY: S | CATEGORY: Functional

---

## Non-Functional Requirements

### REQ-020: Performance
ACCEPTANCE:
  - [ ] Workspace loads in < 3 seconds on broadband
  - [ ] Agent output streams with < 500ms latency
  - [ ] File browser renders 1000+ files without lag
  - [ ] Uses < 512MB RAM idle, < 2GB with active agent

PRIORITY: Must | COMPLEXITY: M | CATEGORY: Non-Functional

### REQ-021: Self-Hosted Deployment
ACCEPTANCE:
  - [ ] Single Docker container: docker run -p 3100:3100 made
  - [ ] All config via environment variables
  - [ ] No external services required (agents are subprocesses)
  - [ ] Works on $5/month VPS (1 vCPU, 1GB RAM minimum)

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Non-Functional

### REQ-022: Browser Compatibility
ACCEPTANCE:
  - [ ] Works in Chrome, Firefox, Safari (last 2 versions)
  - [ ] No desktop install required
  - [ ] Mobile: view-only (no agent control on mobile in MVP)

PRIORITY: Should | COMPLEXITY: S | CATEGORY: Non-Functional

---

## Security Requirements

### REQ-030: Authentication Token
ACCEPTANCE:
  - [ ] MADE_TOKEN env var enables auth on all endpoints
  - [ ] Token sent via Authorization: Bearer header
  - [ ] If MADE_TOKEN not set, warning logged on startup
  - [ ] WebSocket supports token in connection header

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Security

### REQ-031: Path Traversal Protection
ACCEPTANCE:
  - [ ] File access restricted to session's workDir
  - [ ] No access to ../ or absolute paths outside workDir
  - [ ] Upload file types restricted (no SVG, no HTML, no executables)

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Security

### REQ-032: Command Safety
ACCEPTANCE:
  - [ ] Dangerous commands blocked (rm -rf /, sudo, mkfs, dd)
  - [ ] Optional sandbox mode (MADE_SANDBOX=true)
  - [ ] Agent commands visible to user before/during execution

PRIORITY: Must | COMPLEXITY: S | CATEGORY: Security

---

## Technical Requirements

### REQ-040: Stack
  - [ ] Node.js 22+ (server)
  - [ ] Vanilla HTML/CSS/JS (frontend — no framework)
  - [ ] WebSocket (real-time)
  - [ ] node-pty (agent terminal capture)
  - [ ] Zero build step

### REQ-041: Agent Adapter Protocol
  - [ ] Each adapter is a .mjs file with: detect(), start(prompt), stop()
  - [ ] Adapters spawn agent CLIs as child processes
  - [ ] Stdout/stderr streamed via WebSocket
  - [ ] Exit code captured and reported
  - [ ] No model management (agent handles its own models)

### REQ-042: Data Storage
  - [ ] File-based JSON storage (no database in MVP)
  - [ ] Sessions saved to .made-data/sessions.json
  - [ ] User preferences in localStorage
  - [ ] Git state is the agent's concern (not stored separately)

---

## Summary

| Category    | Must | Should | Nice | Total |
|-------------|------|--------|------|-------|
| Functional  | 7    | 2      | 0    | 9     |
| Non-Func    | 2    | 1      | 0    | 3     |
| Security    | 3    | 0      | 0    | 3     |
| Technical   | 3    | 0      | 0    | 3     |
| **TOTAL**   | **15** | **3** | **0** | **18** |

**MVP scope: 15 Must requirements. Estimated solo: 10-14 days.**

### Gate Check

1. All Must requirements testable? YES — each has checkbox criteria
2. Every requirement has acceptance criteria? YES
3. Total count reasonable? YES — 18 for solo MVP
4. All priorities assigned? YES
5. Security requirements present? YES — 3 security reqs
6. No fake model selectors? YES — explicitly excluded in REQ-003 and REQ-041

**VERDICT: PROCEED to Phase 3** ✓
