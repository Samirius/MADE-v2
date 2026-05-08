// MADE v2 — Frontend Application
// Vanilla JS, no framework, no build step

const API = "";  // same origin
let currentUser = null;
let currentSession = null;
let ws = null;
let agents = [];

// Track streamed output for command cards
let currentStreamOutput = "";
let changedFileList = [];

// ─── Init ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Check if user exists in localStorage
  const stored = localStorage.getItem("made-user");
  if (stored) {
    currentUser = JSON.parse(stored);
  } else {
    document.getElementById("onboard-overlay").style.display = "flex";
    return;
  }

  await init();
});

async function completeOnboarding() {
  const name = document.getElementById("user-name").value.trim();
  if (!name) { document.getElementById("user-name").style.borderColor = "#ef4444"; return; }

  currentUser = { name, joinedAt: new Date().toISOString() };
  localStorage.setItem("made-user", JSON.stringify(currentUser));
  document.getElementById("onboard-overlay").style.display = "none";
  await init();
}

async function init() {
  // Load agents
  try {
    const res = await fetch(`${API}/api/agents`);
    agents = await res.json();
  } catch (e) { console.error("Failed to load agents:", e); }

  // Load sessions
  await loadSessions();

  // Restore last session
  const lastSession = localStorage.getItem("made-last-session");
  if (lastSession) {
    const sessions = await (await fetch(`${API}/api/sessions`)).json();
    const found = sessions.find(s => s.id === lastSession);
    if (found) selectSession(found.id);
  }
}

// ─── Sessions ──────────────────────────────────────────
async function loadSessions() {
  try {
    const res = await fetch(`${API}/api/sessions`);
    const sessions = await res.json();
    const list = document.getElementById("session-list");
    list.innerHTML = "";
    sessions.forEach(s => {
      const div = document.createElement("div");
      div.className = `session-item ${currentSession?.id === s.id ? "active" : ""}`;
      div.innerHTML = `<span class="session-name">${escapeHtml(s.name)}</span>
        <span class="session-meta">${escapeHtml(s.agentId)} · ${new Date(s.createdAt).toLocaleDateString()}</span>`;
      div.addEventListener("click", () => selectSession(s.id));
      list.appendChild(div);
    });
  } catch {}
}

async function selectSession(id) {
  try {
    const res = await fetch(`${API}/api/sessions/${id}`);
    currentSession = await res.json();
    localStorage.setItem("made-last-session", id);
  } catch { return; }

  // Show session view
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("session-view").style.display = "flex";
  document.getElementById("session-name").textContent = currentSession.name;
  document.getElementById("session-agent").textContent = currentSession.agentId;

  // Load agent selector
  const select = document.getElementById("agent-select");
  select.innerHTML = agents.map(a =>
    `<option value="${a.id}" ${!a.available ? 'disabled' : ''} ${a.id === currentSession.agentId ? 'selected' : ''}>${escapeHtml(a.name)} ${a.available ? '✓' : '(not installed)'}</option>`
  ).join("");

  // Connect WebSocket
  connectWS(id);

  // Load messages
  await loadMessages(id);

  // Load files
  await loadFiles(id, "");

  // Load git status
  await loadGitStatus(id);

  // Hide diff panel on session switch
  document.getElementById("diff-panel").style.display = "none";

  // Refresh session list (highlight active)
  await loadSessions();
}

// ─── WebSocket ──────────────────────────────────────────
function connectWS(sessionId) {
  if (ws) ws.close();

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}/ws?sessionId=${sessionId}`);

  ws.onopen = () => {
    console.log(`WS connected to session ${sessionId}`);
  };

  ws.onerror = (err) => {
    console.error("WS error:", err);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "agent_start") {
      appendMessage(msg);
      setAgentStatus("working");
      currentStreamOutput = "";
    } else if (msg.type === "agent_stream") {
      appendStream(msg);
      currentStreamOutput += msg.content || "";
    } else if (msg.type === "agent_done") {
      handleAgentDone(msg, sessionId);
    } else if (msg.type === "connected") {
      console.log("WS connected to session", sessionId);
    }
  };

  ws.onclose = () => {
    console.log("WS disconnected");
    // Reconnect after 3s
    setTimeout(() => { if (currentSession?.id === sessionId) connectWS(sessionId); }, 3000);
  };
}

// ─── FEATURE 1: Command Output Card on agent_done ──────
function handleAgentDone(msg, sessionId) {
  setAgentStatus("idle");
  document.getElementById("btn-stop").style.display = "none";
  document.getElementById("btn-send").style.display = "";

  const exitCode = msg.metadata?.exitCode ?? 0;
  const output = currentStreamOutput || msg.content || "";
  currentStreamOutput = "";

  appendCommandCard(exitCode, output);

  // FEATURE 2: auto-refresh git status and files after agent run
  loadGitStatus(sessionId);
  loadFiles(sessionId, "");
}

function appendCommandCard(exitCode, output) {
  const container = document.getElementById("messages");
  const lines = output.split("\n");
  const isLong = lines.length > 10;
  const success = exitCode === 0;

  const card = document.createElement("div");
  card.className = "cmd-card";

  // Header
  const header = document.createElement("div");
  header.className = "cmd-card-header";

  const badge = document.createElement("span");
  badge.className = `exit-badge ${success ? "success" : "failure"}`;
  badge.textContent = `exit ${exitCode}`;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "cmd-card-toggle";
  toggleBtn.textContent = isLong ? "▶ Show output" : "▼ Hide output";

  header.appendChild(badge);
  header.appendChild(toggleBtn);

  // Body
  const body = document.createElement("div");
  body.className = "cmd-card-body";
  if (isLong) body.classList.add("collapsed");
  body.textContent = output;

  // Toggle handler
  header.addEventListener("click", () => {
    const collapsed = body.classList.toggle("collapsed");
    toggleBtn.textContent = collapsed ? "▶ Show output" : "▼ Hide output";
  });

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);
  container.scrollTop = container.scrollHeight;
}

// ─── Messages ───────────────────────────────────────────
async function loadMessages(sessionId) {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/messages`);
    const data = await res.json();
    const container = document.getElementById("messages");
    container.innerHTML = "";
    (data.messages || data).forEach(msg => appendMessage(msg));
    container.scrollTop = container.scrollHeight;
  } catch {}
}

function appendMessage(msg) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  const typeClass = msg.type === "user" ? "msg-user" : msg.type === "agent_stream" ? "msg-agent msg-stream" : msg.type === "agent_done" ? "msg-agent" : msg.type === "error" ? "msg-error" : "msg-system";
  const label = msg.userId === currentUser?.name ? currentUser.name : msg.userId;

  div.className = `msg ${typeClass}`;
  div.innerHTML = `<div class="msg-label">${escapeHtml(label)}</div><div class="msg-content">${escapeHtml(msg.content)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

let lastStreamDiv = null;
function appendStream(msg) {
  if (lastStreamDiv && msg.type === "agent_stream") {
    lastStreamDiv.querySelector(".msg-content").textContent += msg.content;
  } else {
    const container = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg msg-agent msg-stream";
    div.innerHTML = `<div class="msg-label">agent</div><div class="msg-content">${escapeHtml(msg.content)}</div>`;
    container.appendChild(div);
    lastStreamDiv = div;
    container.scrollTop = container.scrollHeight;
  }
}

function escapeHtml(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el.innerHTML;
}

// ─── Prompt ─────────────────────────────────────────────
async function sendPrompt() {
  if (!currentSession) return;

  const input = document.getElementById("chat-input");
  const prompt = input.value.trim();
  if (!prompt) return;

  const agentId = document.getElementById("agent-select").value;
  input.value = "";

  // Show user message immediately
  appendMessage({ type: "user", userId: currentUser.name, content: prompt });

  lastStreamDiv = null;
  document.getElementById("btn-send").style.display = "none";
  document.getElementById("btn-stop").style.display = "";

  try {
    await fetch(`${API}/api/sessions/${currentSession.id}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId: currentUser.name, agentId }),
    });
  } catch (e) {
    appendMessage({ type: "error", userId: "system", content: `Failed: ${e.message}` });
    document.getElementById("btn-send").style.display = "";
    document.getElementById("btn-stop").style.display = "none";
  }
}

async function abortAgent() {
  if (!currentSession) return;
  await fetch(`${API}/api/sessions/${currentSession.id}/exec/abort`, { method: "POST" });
  document.getElementById("btn-stop").style.display = "none";
  document.getElementById("btn-send").style.display = "";
  setAgentStatus("idle");
}

// ─── Files ──────────────────────────────────────────────
async function loadFiles(sessionId, path) {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}`);
    const entries = await res.json();
    if (!Array.isArray(entries)) return;

    const tree = document.getElementById("file-tree");
    tree.innerHTML = "";
    entries
      .filter(e => !e.name.startsWith(".") && e.name !== "node_modules")
      .forEach(e => {
        const div = document.createElement("div");
        const isChanged = changedFileList.some(cf => cf.path === `${path}/${e.name}`.replace(/^\//, ""));
        div.className = `file-entry ${e.type === "dir" ? "dir" : ""} ${isChanged ? "changed" : ""}`;
        div.textContent = `${e.type === "dir" ? "📁" : "📄"} ${e.name} ${e.size ? `(${formatSize(e.size)})` : ""}`;
        div.addEventListener("click", () => fileClick(sessionId, `${path}/${e.name}`, e.type === "dir"));
        tree.appendChild(div);
      });
  } catch {}
}

function fileClick(sessionId, path, isDir) {
  if (isDir) {
    loadFiles(sessionId, path);
  } else {
    // Read file content — show in a simple view
    fetch(`${API}/api/sessions/${sessionId}/file?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        // For MVP, just show content in a message
        appendMessage({ type: "system", userId: "system", content: `📄 ${path}\n${data.content?.slice(0, 500)}${(data.content?.length || 0) > 500 ? '\n... (truncated)' : ''}` });
      });
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

// ─── Git ────────────────────────────────────────────────
async function loadGitStatus(sessionId) {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/git/status`);
    const data = await res.json();
    if (data.error) return;

    // Update branch info
    if (data.branch) {
      document.getElementById("git-branch").textContent = `${data.branch} (${data.modified} changed)`;
    }

    // FEATURE 2: Parse changed files and display in "Changes" section
    changedFileList = parseGitStatus(data.raw || "");
    renderChangedFiles(changedFileList);

    // Also update status text area
    const statusEl = document.getElementById("git-status");
    if (data.lastCommit) {
      statusEl.textContent = data.lastCommit;
    }
  } catch {}
}

function parseGitStatus(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split("\n").filter(l => l.trim()).map(line => {
    const statusCode = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    let changeType = "modified";
    if (statusCode.includes("A") || statusCode.includes("??")) changeType = "added";
    else if (statusCode.includes("D")) changeType = "deleted";
    else if (statusCode.includes("M")) changeType = "modified";
    else if (statusCode.trim() === "??" ) changeType = "untracked";
    return { path: filePath, status: statusCode.trim(), changeType };
  });
}

function renderChangedFiles(files) {
  const container = document.getElementById("changed-files");
  if (!files.length) {
    container.innerHTML = '<div class="no-changes">No changes detected</div>';
    return;
  }
  container.innerHTML = "";
  files.forEach(f => {
    const entry = document.createElement("div");
    entry.className = "changed-file-entry";
    entry.dataset.filepath = f.path;

    const badge = document.createElement("span");
    badge.className = `change-badge ${f.changeType}`;
    badge.textContent = f.changeType.toUpperCase();

    const name = document.createElement("span");
    name.textContent = f.path;

    entry.appendChild(badge);
    entry.appendChild(name);

    // FEATURE 3: Click to show diff for this file
    entry.addEventListener("click", () => showDiff(f.path));

    container.appendChild(entry);
  });
}

// ─── FEATURE 3: Diff Viewer ────────────────────────────
async function showDiff(filePath) {
  if (!currentSession) return;
  const panel = document.getElementById("diff-panel");
  const content = document.getElementById("diff-content");

  panel.style.display = "block";
  content.innerHTML = "Loading diff...";

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/diff`);
    const data = await res.json();
    if (data.error) {
      content.innerHTML = `<div class="diff-line" style="color:var(--red)">Error: ${escapeHtml(data.error.message || "Failed to load diff")}</div>`;
      return;
    }

    const fullDiff = data.diff || "";
    // Filter diff to show sections related to clicked file
    const filtered = filterDiffForFile(fullDiff, filePath);
    content.innerHTML = "";

    if (!filtered.trim()) {
      content.innerHTML = `<div class="diff-line" style="color:var(--text2)">No diff available for ${escapeHtml(filePath)}</div>`;
      return;
    }

    filtered.split("\n").forEach(line => {
      const span = document.createElement("span");
      span.className = "diff-line";
      if (line.startsWith("+++") || line.startsWith("---")) {
        span.classList.add("hunk");
      } else if (line.startsWith("@@")) {
        span.classList.add("hunk");
      } else if (line.startsWith("+")) {
        span.classList.add("added");
      } else if (line.startsWith("-")) {
        span.classList.add("removed");
      } else {
        span.classList.add("context");
      }
      span.textContent = line;
      content.appendChild(span);
      content.appendChild(document.createTextNode("\n"));
    });
  } catch (e) {
    content.innerHTML = `<div class="diff-line" style="color:var(--red)">Error loading diff: ${escapeHtml(e.message)}</div>`;
  }
}

function filterDiffForFile(diff, filePath) {
  // Parse unified diff: find sections starting with --- a/file or +++ b/file
  const lines = diff.split("\n");
  const result = [];
  let inFile = false;
  const basename = filePath.split("/").pop();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for file header lines
    if (line.startsWith("diff --git")) {
      // Check if this diff section is for our file
      if (line.includes(filePath) || line.includes(basename)) {
        inFile = true;
      } else {
        inFile = false;
      }
    }
    if (inFile) {
      result.push(line);
    }
  }

  // If no exact match, return the full diff (for untracked files etc.)
  return result.length > 0 ? result.join("\n") : diff;
}

// ─── FEATURE 4: Approve/Reject Changes UI ──────────────
async function commitChanges() {
  if (!currentSession) return;

  const message = prompt("Enter commit message:");
  if (!message) return;

  if (!confirm(`Approve and commit changes?\n\nMessage: ${message}`)) return;

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.ok) {
      appendMessage({ type: "system", userId: "system", content: `Committed: ${data.sha}` });
      loadGitStatus(currentSession.id);
      loadFiles(currentSession.id, "");
      document.getElementById("diff-panel").style.display = "none";
    } else {
      appendMessage({ type: "error", userId: "system", content: `Commit failed: ${data.error?.message || "Unknown error"}` });
    }
  } catch (e) {
    appendMessage({ type: "error", userId: "system", content: `Commit failed: ${e.message}` });
  }
}

async function discardChanges() {
  if (!currentSession) return;

  if (!confirm("Are you sure you want to discard all uncommitted changes?\nThis cannot be undone.")) return;

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/discard`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.ok) {
      appendMessage({ type: "system", userId: "system", content: "Changes discarded." });
      loadGitStatus(currentSession.id);
      loadFiles(currentSession.id, "");
      document.getElementById("diff-panel").style.display = "none";
    } else {
      appendMessage({ type: "error", userId: "system", content: `Discard failed: ${data.error?.message || "Unknown error"}` });
    }
  } catch (e) {
    appendMessage({ type: "error", userId: "system", content: `Discard failed: ${e.message}` });
  }
}

// ─── New Session Modal ──────────────────────────────────
function showNewSessionModal() {
  document.getElementById("modal-overlay").style.display = "flex";

  // Populate agent picker
  const picker = document.getElementById("agent-picker");
  picker.innerHTML = "";
  agents.forEach(a => {
    const div = document.createElement("div");
    div.className = `agent-option ${a.available ? 'available' : 'unavailable'}`;
    div.dataset.agent = a.id;
    div.innerHTML = `<span class="dot ${a.available ? 'on' : 'off'}"></span>
      <span>${escapeHtml(a.name)}</span>
      <span style="color:var(--text2);font-size:10px">${escapeHtml(a.cliCommand || '')}</span>`;
    if (a.available) {
      div.addEventListener("click", () => selectAgent(a.id, div));
    }
    picker.appendChild(div);
  });
}

let selectedAgent = null;
function selectAgent(id, el) {
  selectedAgent = id;
  document.querySelectorAll(".agent-option").forEach(opt => opt.style.borderColor = "var(--border)");
  el.style.borderColor = "var(--accent)";
}

function hideModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function createSession() {
  const name = document.getElementById("new-name").value.trim() || "Untitled";
  const projectType = document.querySelector('input[name="proj-type"]:checked').value;
  const agentId = selectedAgent || agents.find(a => a.available)?.id || "generic";

  let workDir;
  if (projectType === "local") {
    workDir = document.getElementById("new-workdir").value.trim();
    if (!workDir) { document.getElementById("new-workdir").style.borderColor = "#ef4444"; return; }
  } else if (projectType === "clone") {
    const url = document.getElementById("new-clone-url").value.trim();
    if (!url) { document.getElementById("new-clone-url").style.borderColor = "#ef4444"; return; }
    // TODO: clone endpoint — for MVP, user clones manually and points to local
    appendMessage({ type: "error", userId: "system", content: "Clone not yet implemented. Clone manually and use local path." });
    return;
  } else {
    workDir = ""; // fresh = let server use its default
  }

  try {
    const res = await fetch(`${API}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workDir, agentId, userId: currentUser?.name || "anonymous" }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error?.message || "Failed to create session");
      return;
    }

    const session = await res.json();
    hideModal();
    await loadSessions();
    await selectSession(session.id);
  } catch (e) {
    alert("Failed: " + e.message);
  }
}

// ─── Status ─────────────────────────────────────────────
function setAgentStatus(status) {
  const el = document.getElementById("agent-status");
  el.className = `status-${status}`;
  el.textContent = status === "working" ? "Agent working..." : status === "error" ? "Agent error" : "Agent idle";
}

// ─── Keyboard + Buttons ────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement === document.getElementById("chat-input")) {
    e.preventDefault();
    sendPrompt();
  }
  if (e.key === "Escape") {
    hideModal();
    document.getElementById("onboard-overlay").style.display = "none";
  }
});

// Wire buttons (module functions aren't global, so no onclick in HTML)
document.getElementById("btn-send")?.addEventListener("click", sendPrompt);
document.getElementById("btn-stop")?.addEventListener("click", abortAgent);
document.getElementById("btn-new-session")?.addEventListener("click", showNewSessionModal);

// Toggle project source fields in new session modal
document.querySelectorAll('input[name="proj-type"]').forEach(r => {
  r.addEventListener("change", () => {
    document.getElementById("new-workdir").style.display = r.value === "local" ? "" : "none";
    document.getElementById("new-clone-url").style.display = r.value === "clone" ? "" : "none";
  });
});
document.querySelectorAll("[data-action='new-session']").forEach(el => el.addEventListener("click", showNewSessionModal));
document.querySelectorAll("[data-action='cancel']").forEach(el => el.addEventListener("click", hideModal));
document.querySelectorAll("[data-action='create']").forEach(el => el.addEventListener("click", createSession));
document.querySelectorAll("[data-action='onboard']").forEach(el => el.addEventListener("click", completeOnboarding));
document.querySelectorAll("[data-action='commit']").forEach(el => el.addEventListener("click", commitChanges));
document.querySelectorAll("[data-action='discard']").forEach(el => el.addEventListener("click", discardChanges));
document.querySelectorAll("[data-action='close-diff']").forEach(el => el.addEventListener("click", () => {
  document.getElementById("diff-panel").style.display = "none";
}));
// Also support buttons that just have the right ID/text
document.querySelectorAll("button").forEach(btn => {
  if (btn.textContent.trim() === "Create your first session") btn.addEventListener("click", showNewSessionModal);
});
