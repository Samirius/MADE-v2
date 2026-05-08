# M1 ROADMAP — MADE

**DATE:** May 9, 2026  
**DURATION:** 2 weeks (May 9 - May 23, 2026)

---

## Sprint A: QA + Fix (Days 1-2)

**Goal:** Every existing feature actually works end-to-end in a browser.

| # | Task                                  | Req      | Est  |
|---|---------------------------------------|----------|------|
| A1 | Test all 13 requirements in browser  | ALL      | 2h   |
| A2 | Fix CSS/HTML/JS mismatches            | REQ-013  | 2h   |
| A3 | Fix chat vs agent separation          | REQ-004/5| 2h   |
| A4 | Fix agent streaming to browser        | REQ-005  | 2h   |
| A5 | Fix session header/panel display      | REQ-010  | 1h   |
| A6 | Fix WS reconnection on disconnect     | REQ-011  | 1h   |

**Done when:** All 13 requirements pass acceptance criteria in a real browser.

---

## Sprint B: Missing Features (Days 3-5)

**Goal:** Build anything the QA pass found missing.

| # | Task                                  | Req      | Est  |
|---|---------------------------------------|----------|------|
| B1 | Agent output cards (exit code badge)  | REQ-005  | 2h   |
| B2 | File change detection after agent     | REQ-008  | 2h   |
| B3 | Diff viewer (green/red lines)         | REQ-008  | 3h   |
| B4 | Approve/discard changes UI            | REQ-008  | 2h   |
| B5 | Commit from UI with message           | REQ-009  | 2h   |
| B6 | Session delete from sidebar           | REQ-010  | 1h   |

**Done when:** Full loop works: chat → run agent → see output → review diff → commit.

---

## Sprint C: Docker + Ship (Days 6-7)

**Goal:** Clean deploy from scratch on a fresh machine.

| # | Task                                  | Req      | Est  |
|---|---------------------------------------|----------|------|
| C1 | Test Dockerfile on fresh build        | REQ-001  | 1h   |
| C2 | Fix any Docker build issues           | REQ-001  | 1h   |
| C3 | Write README with install instructions| —        | 1h   |
| C4 | Write API.md                          | —        | 1h   |
| C5 | GitHub Actions CI                     | —        | 1h   |
| C6 | Tag v1.0.0, GitHub Release            | —        | 30m  |

**Done when:** `git clone && docker compose up` works on a fresh Ubuntu box.

---

## Risk Buffer (Days 8-14)

Extra time for:
- Bugs found during QA
- Agent adapter issues (Hermes timeout, OpenCode hanging)
- Disk space cleanup on dev machine
- Polish and edge cases

---

## M1 Done Criteria

M1 is done when ALL of these are true:

1. ✅ `docker compose up` → server running in 60s
2. ✅ Create session → pick local dir → pick Hermes
3. ✅ Send chat message → appears in chat
4. ✅ Run agent → output streams in real-time
5. ✅ Agent finishes → see file changes → see diff
6. ✅ Commit changes from UI
7. ✅ No console errors during the entire flow
8. ✅ Works in Chrome and Firefox
