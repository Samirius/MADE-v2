// MADE v2 — Frontend Application
// Vanilla JS, no framework, no build step

const API = "";  // same origin
let currentUser = null;
let currentSession = null;
let ws = null;
let agents = [];

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
    list.innerHTML = sessions.map(s => `
      <div class="session-item ${currentSession?.id === s.id ? 'active' : ''}" onclick="selectSession('${s.id}')">
        <span class="session-name">${s.name}</span>
        <span class="session-meta">${s.agentId} · ${new Date(s.createdAt).toLocaleDateString()}</span>
      </div>
    `).join("");
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
    `<option value="${a.id}" ${!a.available ? 'disabled' : ''} ${a.id === currentSession.agentId ? 'selected' : ''}>${a.name} ${a.available ? '✓' : '(not installed)'}</option>`
  ).join("");

  // Connect WebSocket
  connectWS(id);

  // Load messages
  await loadMessages(id);

  // Load files
  await loadFiles(id, "");

  // Load git status
  await loadGitStatus(id);

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
    } else if (msg.type === "agent_stream") {
      appendStream(msg);
    } else if (msg.type === "agent_done") {
      appendMessage(msg);
      setAgentStatus("idle");
      document.getElementById("btn-stop").style.display = "none";
      document.getElementById("btn-send").style.display = "";
      // Refresh git status and files
      loadGitStatus(sessionId);
      loadFiles(sessionId, "");
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
  div.innerHTML = `<div class="msg-label">${label}</div><div class="msg-content">${escapeHtml(msg.content)}</div>`;
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
    tree.innerHTML = entries
      .filter(e => !e.name.startsWith(".") && e.name !== "node_modules")
      .map(e => `<div class="file-entry ${e.type === 'dir' ? 'dir' : ''}" onclick="fileClick('${sessionId}','${path}/${e.name}',${e.type === 'dir'})">${e.type === 'dir' ? '📁' : '📄'} ${e.name} ${e.size ? `(${formatSize(e.size)})` : ''}</div>`)
      .join("");
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
    if (data.branch) {
      document.getElementById("git-branch").textContent = `${data.branch} (${data.modified} changed)`;
    }
  } catch {}
}

async function commitChanges() {
  if (!currentSession) return;
  const message = prompt("Commit message:");
  if (!message) return;

  const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (data.ok) {
    appendMessage({ type: "system", userId: "system", content: `Committed: ${data.sha}` });
    loadGitStatus(currentSession.id);
  }
}

// ─── New Session Modal ──────────────────────────────────
function showNewSessionModal() {
  document.getElementById("modal-overlay").style.display = "flex";

  // Populate agent picker
  const picker = document.getElementById("agent-picker");
  picker.innerHTML = agents.map(a => `
    <div class="agent-option ${a.available ? 'available' : 'unavailable'}" onclick="${a.available ? `selectAgent('${a.id}')` : ''}">
      <span class="dot ${a.available ? 'on' : 'off'}"></span>
      <span>${a.name}</span>
      <span style="color:var(--text2);font-size:10px">${a.cliCommand}</span>
    </div>
  `).join("");

  // Show/hide clone URL
  document.querySelectorAll('input[name="project-type"]').forEach(r => {
    r.addEventListener("change", () => {
      document.getElementById("new-workdir").style.display = r.value === "local" ? "" : "none";
      document.getElementById("new-clone-url").style.display = r.value === "clone" ? "" : "none";
    });
  });
}

let selectedAgent = null;
function selectAgent(id) {
  selectedAgent = id;
  document.querySelectorAll(".agent-option").forEach(el => el.style.borderColor = "var(--border)");
  event.currentTarget.style.borderColor = "var(--accent)";
}

function hideModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function createSession() {
  const name = document.getElementById("new-name").value.trim() || "Untitled";
  const projectType = document.querySelector('input[name="project-type"]:checked').value;
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
document.querySelectorAll("[data-action='new-session']").forEach(el => el.addEventListener("click", showNewSessionModal));
document.querySelectorAll("[data-action='cancel']").forEach(el => el.addEventListener("click", hideModal));
document.querySelectorAll("[data-action='create']").forEach(el => el.addEventListener("click", createSession));
document.querySelectorAll("[data-action='onboard']").forEach(el => el.addEventListener("click", completeOnboarding));
document.querySelectorAll("[data-action='commit']").forEach(el => el.addEventListener("click", commitChanges));
document.querySelectorAll("[data-action='discard']").forEach(el => el.addEventListener("click", discardChanges));
// Also support buttons that just have the right ID/text
document.querySelectorAll("button").forEach(btn => {
  if (btn.textContent.trim() === "Create your first session") btn.addEventListener("click", showNewSessionModal);
});
