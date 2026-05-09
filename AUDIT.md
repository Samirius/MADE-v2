# MADE v2 — Code Quality Audit Report

**Date:** May 9, 2026
**Scope:** 14 source files, 3,000+ lines
**Requirements:** 13 M1 reqs checked

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3     |
| HIGH     | 8     |
| MEDIUM   | 11    |
| LOW      | 7     |
| **Total** | **29** |

## M1 Requirements: 7 PASS, 6 PARTIAL, 0 FAIL

## CRITICAL (fix now)

C-01: Static file path traversal — no isPathSafe check on serveStatic
C-02: Dead __agentFromWS crashes on WS prompt messages  
C-03: sessionId used as filename without sanitization

## HIGH (fix before release)

H-01: 204 response with JSON body (violates HTTP spec)
H-02: Race condition on file-based store (TOCTOU)
H-03: resolveAdapter called without workDir
H-04: resolveAdapter creates 2 unnecessary instances
H-05: POST /messages creates messages without id field
H-06: XSS risk in session list innerHTML
H-07: No request body size limit
H-08: Generic adapter command injection

## MEDIUM (fix in M2)

M-01: Unused node-pty dependency
M-02: CI only checks syntax, not imports
M-03: WS auto-reconnect without limit
M-04: Clone feature UI shown but not implemented
M-05: Diff filter falls back to full diff
M-06: No test files exist
M-07: isPathSafe bypassable with /app2 prefix
M-08: Git commit message shell injection risk
M-09: Duplicate workDir existence check
M-10: escapeHtml uses DOM — inconsistent
M-11: req.headers.host can be undefined
