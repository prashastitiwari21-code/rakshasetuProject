// =====================================================
// script.js  -  all the logic of the RakshaSetu prototype
// (uses the fake data from data.js, no backend needed)
// =====================================================

// ---------- STATE (the things that change while the app runs) ----------
const STORAGE_KEY = "rakshasetu-contractors-v1";

let contractors = loadContractors();
let incidents = clone(defaultIncidents);

let currentContractorId = null;   // which profile is open
let currentIncidentId = null;     // which incident is open
let draft = {};                   // slider values on the profile page (not saved yet)
let soundOn = true;

// simulator state
let sim = { current: 0, files: 0, sensitive: 0, threat: 0 };
let simTimers = [];
let numberTimers = {};
let autoTimer = null;

// ---------- SMALL HELPERS ----------
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Makes text safe before putting it inside innerHTML
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getContractor(id) {
  return contractors.find(function (c) { return c.id === id; });
}

function getIncident(id) {
  return incidents.find(function (i) { return i.id === id; });
}

function contractorName(id) {
  const c = getContractor(id);
  return c ? c.name : "Unknown contractor";
}

// CyberTrust score = weighted sum of the factors + incident bonus/penalty
function calcScore(f) {
  let raw = INCIDENT_BONUS[f.incident] || 0;
  FACTORS.forEach(function (item) {
    raw += f[item.key] * item.weight;
  });
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getRisk(score) {
  if (score >= 90) return "Low";
  if (score >= 75) return "Moderate";
  if (score >= 60) return "High";
  return "Critical";
}

function getStatus(risk) {
  if (risk === "Low") return "Secure";
  if (risk === "Moderate") return "Review";
  if (risk === "High") return "Action Needed";
  return "Action Required";
}

// For threat scores (higher = worse), used by the simulator
function threatLevel(t) {
  if (t < 40) return "Low";
  if (t < 70) return "Moderate";
  if (t < 85) return "High";
  return "Critical";
}

function isOpen(incident) {
  return incident.status === "DETECTED" || incident.status === "INVESTIGATING";
}

// ---------- SAVING TO THE BROWSER (localStorage) ----------
function isValidContractor(c) {
  return c &&
    typeof c.id === "string" && /^[A-Za-z0-9-]+$/.test(c.id) &&
    typeof c.name === "string" &&
    c.factors &&
    FACTORS.every(function (f) { return typeof c.factors[f.key] === "number"; });
}

function loadContractors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.every(isValidContractor)) return data;
    }
  } catch (e) { /* storage not available, use defaults */ }
  return clone(defaultContractors);
}

function saveContractors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contractors));
  } catch (e) { /* ignore */ }
}

// ---------- TOAST MESSAGE ----------
let toastTimer = null;
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove("show");
  }, 2600);
}

// ---------- SOUND (Web Audio API, no files needed) ----------
let audioCtx = null;

function beep(freq, ms, type) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* sound not supported, ignore */ }
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("sound-btn").textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
}

function playStepSound(n) {
  if (n === 1) {
    beep(440, 150);
  } else if (n === 2) {
    beep(600, 180, "triangle");
    simTimers.push(setTimeout(function () { beep(600, 180, "triangle"); }, 300));
  } else if (n === 3) {
    for (let i = 0; i < 6; i++) {
      simTimers.push(setTimeout(function () {
        beep(i % 2 === 0 ? 880 : 660, 160, "sawtooth");
      }, i * 200));
    }
  } else if (n === 4) {
    beep(523, 150);
    simTimers.push(setTimeout(function () { beep(659, 150); }, 160));
    simTimers.push(setTimeout(function () { beep(784, 250); }, 320));
  }
}

// ---------- SWITCHING SCREENS ----------
const pageTitles = {
  dash: "Overview Dashboard",
  contractors: "Contractor Directory",
  profile: "Contractor Security Profile",
  incidents: "Incident Center",
  investigation: "Incident Investigation",
  sim: "Attack Simulator"
};

// Profile belongs to the Contractors menu, Investigation to Incidents
const navFor = {
  dash: "dash", contractors: "contractors", profile: "contractors",
  incidents: "incidents", investigation: "incidents", sim: "sim"
};

function showView(name) {
  // profile / investigation need something selected
  if (name === "profile" && !getContractor(currentContractorId)) name = "contractors";
  if (name === "investigation" && !getIncident(currentIncidentId)) name = "incidents";

  document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
  document.getElementById("view-" + name).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
  document.getElementById("nav-" + navFor[name]).classList.add("active");

  document.getElementById("page-title").textContent = pageTitles[name];

  if (name === "dash") renderDashboard();
  if (name === "contractors") renderDirectory();
  if (name === "profile") renderProfile();
  if (name === "incidents") renderIncidentList();
  if (name === "investigation") renderInvestigation();
  if (name === "sim") renderSimSteps();

  updateIncidentCount();
  window.scrollTo(0, 0);
}

function updateIncidentCount() {
  const open = incidents.filter(isOpen).length;
  document.getElementById("incident-count").textContent = open;
}

// =====================================================
// DASHBOARD
// =====================================================
function renderDashboard() {
  renderAlertBanner();
  renderStats();
  renderBars();
  renderDonut();
  renderNeedsAttention();
  renderRecentIncidents();
}

function renderAlertBanner() {
  const critical = incidents.filter(function (i) {
    return i.severity === "Critical" && i.status === "DETECTED";
  });
  let html = "";
  if (critical.length > 0) {
    const inc = critical[0];
    html = `
      <div class="alert-banner">
        <span>🚨 <strong>${critical.length} critical incident needs action:</strong> ${esc(inc.title)} (${esc(contractorName(inc.contractorId))})</span>
        <button class="danger-btn" onclick="openIncident('${inc.id}')">Investigate</button>
      </div>`;
  }
  document.getElementById("alert-banner").innerHTML = html;
}

function renderStats() {
  const total = contractors.length;
  let sum = 0;
  let atRisk = 0;
  contractors.forEach(function (c) {
    const score = calcScore(c.factors);
    sum += score;
    const risk = getRisk(score);
    if (risk === "High" || risk === "Critical") atRisk++;
  });
  const average = total > 0 ? Math.round(sum / total) : 0;
  const openCount = incidents.filter(isOpen).length;

  document.getElementById("stats").innerHTML = `
    <div class="stat-box blue"><div class="label">Total Contractors</div><div class="number">${total}</div></div>
    <div class="stat-box green"><div class="label">Average CyberTrust Score</div><div class="number">${average}</div></div>
    <div class="stat-box orange"><div class="label">High / Critical Risk</div><div class="number">${atRisk}</div></div>
    <div class="stat-box red"><div class="label">Open Incidents</div><div class="number">${openCount}</div></div>`;
}

function renderBars() {
  let html = "";
  contractors.forEach(function (c) {
    const score = calcScore(c.factors);
    const risk = getRisk(score);
    html += `
      <div class="bar-row clickable" onclick="openProfile('${c.id}')">
        <div class="bar-name">${esc(c.name)}</div>
        <div class="bar-track"><div class="bar-fill fill-${risk}" style="width:${score}%"></div></div>
        <div class="bar-score">${score}</div>
      </div>`;
  });
  if (html === "") html = '<p class="empty show">No contractors yet.</p>';
  document.getElementById("bars").innerHTML = html;
}

// Donut chart made with CSS conic-gradient (no library)
function renderDonut() {
  const levels = ["Low", "Moderate", "High", "Critical"];
  const colors = { Low: "#10b981", Moderate: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
  const counts = { Low: 0, Moderate: 0, High: 0, Critical: 0 };

  contractors.forEach(function (c) {
    counts[getRisk(calcScore(c.factors))]++;
  });

  const total = contractors.length;
  let gradient = "#1a263d";
  if (total > 0) {
    let start = 0;
    const parts = [];
    levels.forEach(function (level) {
      const end = start + (counts[level] / total) * 100;
      parts.push(colors[level] + " " + start + "% " + end + "%");
      start = end;
    });
    gradient = "conic-gradient(" + parts.join(", ") + ")";
  }
  document.getElementById("donut").style.background = gradient;
  document.getElementById("donut-hole").textContent = total;

  let legend = "";
  levels.forEach(function (level) {
    legend += `<div class="legend-row"><span class="dot fill-${level}"></span>${level}: <strong>${counts[level]}</strong></div>`;
  });
  document.getElementById("donut-legend").innerHTML = legend;
}

function renderNeedsAttention() {
  const list = contractors
    .map(function (c) { return { c: c, score: calcScore(c.factors) }; })
    .filter(function (x) { const r = getRisk(x.score); return r === "High" || r === "Critical"; })
    .sort(function (a, b) { return a.score - b.score; });

  let html = "";
  list.forEach(function (x) {
    const risk = getRisk(x.score);
    html += `
      <tr>
        <td><strong>${esc(x.c.name)}</strong></td>
        <td><span class="pill score-bg-${risk}">${x.score}</span></td>
        <td><span class="badge ${risk}">${risk}</span></td>
        <td><button class="view-btn" onclick="openProfile('${x.c.id}')">View</button></td>
      </tr>`;
  });
  if (html === "") html = '<tr><td colspan="4" class="muted">Nothing needs attention right now.</td></tr>';
  document.getElementById("dash-body").innerHTML = html;
}

function renderRecentIncidents() {
  let html = "";
  incidents.forEach(function (inc) {
    html += `
      <div class="mini-row">
        <div>
          <strong>${esc(inc.title)}</strong>
          <div class="muted small-text">${esc(contractorName(inc.contractorId))}</div>
        </div>
        <div class="mini-right">
          <span class="chip status-${inc.status}">${inc.status}</span>
          <button class="view-btn" onclick="openIncident('${inc.id}')">Open</button>
        </div>
      </div>`;
  });
  document.getElementById("dash-incidents").innerHTML = html;
}

// =====================================================
// CONTRACTOR DIRECTORY
// =====================================================
function renderDirectory() {
  const searchText = document.getElementById("search").value.toLowerCase();
  const filterValue = document.getElementById("filter").value;
  const sortValue = document.getElementById("sort").value;

  let list = contractors
    .map(function (c) { return { c: c, score: calcScore(c.factors) }; })
    .filter(function (x) {
      const risk = getRisk(x.score);
      const text = (x.c.name + " " + x.c.dept).toLowerCase();
      return text.includes(searchText) && (filterValue === "All" || filterValue === risk);
    });

  if (sortValue === "name") list.sort(function (a, b) { return a.c.name.localeCompare(b.c.name); });
  if (sortValue === "low") list.sort(function (a, b) { return a.score - b.score; });
  if (sortValue === "high") list.sort(function (a, b) { return b.score - a.score; });

  let html = "";
  list.forEach(function (x) {
    const risk = getRisk(x.score);
    html += `
      <tr>
        <td><strong>${esc(x.c.name)}</strong></td>
        <td>${esc(x.c.dept)}</td>
        <td>${esc(x.c.project)}</td>
        <td><span class="pill score-bg-${risk}">${x.score}</span></td>
        <td><span class="badge ${risk}">${risk}</span></td>
        <td>${getStatus(risk)}</td>
        <td class="no-wrap">
          <button class="view-btn" onclick="openProfile('${x.c.id}')">Profile</button>
          <button class="del-btn" onclick="deleteContractor('${x.c.id}')" title="Delete">🗑</button>
        </td>
      </tr>`;
  });
  document.getElementById("dir-body").innerHTML = html;
  document.getElementById("dir-empty").classList.toggle("show", list.length === 0);
}

function deleteContractor(id) {
  const c = getContractor(id);
  if (!c) return;
  if (!confirm("Delete " + c.name + "?")) return;
  contractors = contractors.filter(function (item) { return item.id !== id; });
  saveContractors();
  renderDirectory();
  updateIncidentCount();
  showToast("Contractor deleted");
}

function buildAddForm() {
  let html = "";
  FACTORS.forEach(function (f) {
    html += `
      <div class="field">
        <label>${f.icon} ${f.label}</label>
        <input type="number" id="new-${f.key}" min="0" max="100" value="70">
      </div>`;
  });
  document.getElementById("new-factors").innerHTML = html;
}

function addContractor() {
  const name = document.getElementById("new-name").value.trim();
  if (name === "") {
    showToast("Please enter a contractor name");
    return;
  }

  const factors = { incident: document.getElementById("new-incident").value };
  for (let i = 0; i < FACTORS.length; i++) {
    const key = FACTORS[i].key;
    const value = Number(document.getElementById("new-" + key).value);
    if (isNaN(value) || value < 0 || value > 100) {
      showToast("Factor values must be between 0 and 100");
      return;
    }
    factors[key] = value;
  }

  const newContractor = {
    id: "CTR-" + Date.now(),
    name: name,
    dept: document.getElementById("new-dept").value.trim() || "Not specified",
    project: document.getElementById("new-project").value.trim() || "Not specified",
    factors: factors
  };

  contractors.push(newContractor);
  saveContractors();

  // clear the form
  document.getElementById("new-name").value = "";
  document.getElementById("new-dept").value = "";
  document.getElementById("new-project").value = "";
  FACTORS.forEach(function (f) { document.getElementById("new-" + f.key).value = 70; });
  document.querySelector(".add-card").open = false;

  renderDirectory();
  showToast(name + " added (score " + calcScore(factors) + ")");
}

// =====================================================
// CONTRACTOR PROFILE (factor sliders + AI recommendations)
// =====================================================
function openProfile(id) {
  currentContractorId = id;
  draft = Object.assign({}, getContractor(id).factors);
  showView("profile");
}

function renderProfile() {
  const c = getContractor(currentContractorId);

  let sliders = "";
  FACTORS.forEach(function (f) {
    sliders += `
      <div class="slider-row">
        <div class="slider-top">
          <span>${f.icon} ${f.label} <span class="muted small-text">(${Math.round(f.weight * 100)}% of score)</span></span>
          <strong id="pf-val-${f.key}">${draft[f.key]}%</strong>
        </div>
        <input type="range" id="pf-${f.key}" min="0" max="100" value="${draft[f.key]}" oninput="onSlider('${f.key}', this.value)">
      </div>`;
  });

  let options = "";
  Object.keys(INCIDENT_BONUS).forEach(function (level) {
    const selected = draft.incident === level ? "selected" : "";
    options += `<option value="${level}" ${selected}>${level}</option>`;
  });

  document.getElementById("profile").innerHTML = `
    <div class="card profile-head">
      <div>
        <h1>${esc(c.name)}</h1>
        <p class="muted">${esc(c.dept)} &bull; ${esc(c.project)}</p>
      </div>
      <div class="score-box">
        <div class="label">CyberTrust Score</div>
        <div class="big-score" id="pf-score">0</div>
        <span id="pf-risk"></span>
        <div class="muted small-text" id="pf-delta"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>🛡️ Security Posture Simulator</h3>
        <p class="hint">Move the sliders to see how the score changes. Nothing is saved until you click Save.</p>
        ${sliders}
        <div class="slider-row">
          <div class="slider-top"><span>📋 Incident history (bonus / penalty)</span></div>
          <select id="pf-incident" onchange="onIncidentHistory(this.value)">${options}</select>
        </div>
        <div class="btn-row">
          <button class="primary-btn" onclick="saveProfile()">Save changes</button>
          <button class="small-btn" onclick="renderProfile()">Undo changes</button>
        </div>
      </div>

      <div class="card">
        <h3>🧠 AI Security Recommendations</h3>
        <p class="hint">Rule-based tips generated from the current slider values.</p>
        <div id="pf-recs"></div>
      </div>
    </div>`;

  updateProfileLive();
}

function onSlider(key, value) {
  draft[key] = Number(value);
  document.getElementById("pf-val-" + key).textContent = value + "%";
  updateProfileLive();
}

function onIncidentHistory(value) {
  draft.incident = value;
  updateProfileLive();
}

function updateProfileLive() {
  const c = getContractor(currentContractorId);
  const savedScore = calcScore(c.factors);
  const nowScore = calcScore(draft);
  const risk = getRisk(nowScore);
  const diff = nowScore - savedScore;

  const scoreEl = document.getElementById("pf-score");
  scoreEl.textContent = nowScore;
  scoreEl.className = "big-score score-" + risk;

  document.getElementById("pf-risk").innerHTML = `<span class="badge ${risk}">${risk}</span> <span class="muted small-text">${getStatus(risk)}</span>`;

  let deltaText = "No unsaved changes";
  if (diff > 0) deltaText = "+" + diff + " compared to saved score";
  if (diff < 0) deltaText = diff + " compared to saved score";
  document.getElementById("pf-delta").textContent = deltaText;

  document.getElementById("pf-recs").innerHTML = recommendationsHtml(draft);
}

function recommendationsHtml(f) {
  const tips = FACTORS
    .map(function (item) {
      return { label: item.label, value: f[item.key], tip: item.tip, gain: Math.round((100 - f[item.key]) * item.weight) };
    })
    .filter(function (t) { return t.value < 90 && t.gain > 0; })
    .sort(function (a, b) { return b.gain - a.gain; })
    .slice(0, 3);

  let html = "";
  tips.forEach(function (t) {
    html += `<li><strong>${t.label} is ${t.value}%.</strong> ${t.tip} <span class="gain">+${t.gain} pts</span></li>`;
  });

  if (f.incident === "Poor" || f.incident === "Critical") {
    html += `<li><strong>Incident history is ${f.incident}.</strong> Review past incidents and close the root causes. <span class="gain">up to +${5 - INCIDENT_BONUS[f.incident]} pts</span></li>`;
  }

  if (html === "") {
    return '<p class="good-text">✅ All factors look strong. Maintain the current security practices.</p>';
  }
  return '<ul class="rec-list">' + html + "</ul>";
}

function saveProfile() {
  const c = getContractor(currentContractorId);
  c.factors = Object.assign({}, draft);
  saveContractors();
  updateProfileLive();
  showToast("Saved. New score: " + calcScore(c.factors));
}

// =====================================================
// INCIDENTS
// =====================================================
function renderIncidentList() {
  let html = "";
  incidents.forEach(function (inc) {
    html += `
      <tr>
        <td class="no-wrap">${inc.id}</td>
        <td><strong>${esc(contractorName(inc.contractorId))}</strong></td>
        <td>${esc(inc.title)}</td>
        <td><span class="badge ${inc.severity}">${inc.severity}</span></td>
        <td><span class="pill score-bg-${threatLevel(inc.threatScore)}">${inc.threatScore}</span></td>
        <td><span class="chip status-${inc.status}">${inc.status}</span></td>
        <td><button class="view-btn" onclick="openIncident('${inc.id}')">Investigate</button></td>
      </tr>`;
  });
  document.getElementById("inc-body").innerHTML = html;
}

function openIncident(id) {
  currentIncidentId = id;
  showView("investigation");
}

function renderInvestigation() {
  const inc = getIncident(currentIncidentId);
  const u = inc.user;

  // anomaly factors
  let anomalies = "";
  inc.anomalies.forEach(function (a) {
    anomalies += `
      <div class="anomaly">
        <div><strong>${esc(a.factor)}</strong><div class="muted small-text">${esc(a.detail)}</div></div>
        <span class="risk-pts">${esc(a.risk)}</span>
      </div>`;
  });

  // timeline
  let maxCount = 1;
  inc.timeline.forEach(function (t) { if (t.count > maxCount) maxCount = t.count; });
  let timeline = "";
  inc.timeline.forEach(function (t) {
    const width = Math.max((t.count / maxCount) * 100, 2);
    timeline += `
      <div class="tl-row">
        <div class="tl-time">${esc(t.time)}</div>
        <div class="tl-body">
          <div>${esc(t.event)}</div>
          <div class="tl-bar"><div style="width:${width}%"></div></div>
        </div>
        <div class="tl-count">${t.count > 0 ? t.count.toLocaleString("en-IN") : "-"}</div>
      </div>`;
  });

  // blast radius
  let categories = "";
  inc.blast.categories.forEach(function (cat) {
    const width = (cat.count / inc.detection.files) * 100;
    categories += `
      <div class="cat-row">
        <div class="cat-top"><span>${esc(cat.name)}</span><span><strong>${cat.count}</strong> files, <span class="red-text">${cat.sensitive} sensitive</span></span></div>
        <div class="bar-track"><div class="bar-fill fill-High" style="width:${width}%"></div></div>
      </div>`;
  });
  let projects = "";
  inc.blast.projects.forEach(function (p) { projects += `<span class="tag">${esc(p)}</span>`; });
  let departments = "";
  inc.blast.departments.forEach(function (d) { departments += `<span class="tag purple">${esc(d)}</span>`; });

  // AI analysis
  let whyList = "";
  inc.ai.why.split("\n").forEach(function (line) { whyList += `<li>${esc(line)}</li>`; });

  // audit log
  let audit = "";
  inc.auditLog.forEach(function (a) {
    audit += `
      <tr>
        <td class="no-wrap">${esc(a.time)}</td>
        <td><strong>${esc(a.action)}</strong></td>
        <td>${esc(a.officer)}</td>
        <td>${esc(a.detail)}</td>
      </tr>`;
  });

  document.getElementById("investigation").innerHTML = `
    <div class="card inc-head ${inc.severity}">
      <div class="inc-top">
        <div>
          <h2>🚨 ${esc(inc.title)}</h2>
          <p class="muted">${inc.id} &bull; ${esc(contractorName(inc.contractorId))} &bull; ${esc(u.name)} &bull; Threat score <strong>${inc.threatScore}/100</strong></p>
        </div>
        <div>
          <span class="badge ${inc.severity}">${inc.severity}</span>
          <span class="chip status-${inc.status}">${inc.status}</span>
        </div>
      </div>
      <div class="btn-row">
        <button class="danger-btn" onclick="doAction('FREEZE_SESSION')">🔒 Freeze Session</button>
        <button class="warn-btn" onclick="doAction('FORCE_REAUTH')">🔐 Force Re-Auth</button>
        <button class="primary-btn" onclick="doAction('ESCALATE')">📢 Escalate to CERT-In</button>
        <button class="small-btn" onclick="doAction('REQUEST_AUDIT')">📝 Request Audit</button>
        <button class="small-btn" onclick="doAction('CONTAIN')">🛡️ Contain</button>
        <button class="good-btn" onclick="doAction('RESOLVE')">✅ Resolve</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>👤 User &amp; Session</h3>
        <div class="kv"><span>Name</span><strong>${esc(u.name)}</strong></div>
        <div class="kv"><span>Employee ID</span><strong>${esc(u.employeeId)}</strong></div>
        <div class="kv"><span>Role</span><strong>${esc(u.role)}</strong></div>
        <div class="kv"><span>Assigned project</span><strong>${esc(u.project)}</strong></div>
        <div class="kv"><span>Device</span><strong>${esc(u.device)}</strong></div>
        <div class="kv"><span>IP address</span><strong>${esc(u.ip)}</strong></div>
        <div class="kv"><span>Login time</span><strong>${esc(u.loginTime)}</strong></div>
        <div class="kv"><span>Normal files / day</span><strong>${u.normalFiles}</strong></div>
        <div class="kv"><span>Session status</span><strong class="session-${u.sessionStatus}">${u.sessionStatus.replace("_", " ")}</strong></div>
      </div>

      <div class="card">
        <h3>⚠️ Why it was flagged</h3>
        ${anomalies}
        <div class="kv top-gap"><span>Files accessed</span><strong>${inc.detection.files.toLocaleString("en-IN")} in ${inc.detection.minutes} min</strong></div>
        <div class="kv"><span>Sensitive files</span><strong class="red-text">${inc.detection.sensitive}</strong></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>⏱️ Access Surge Timeline</h3>
        ${timeline}
      </div>

      <div class="card">
        <h3>💥 Blast Radius</h3>
        <div class="blast-tree">
          <div class="blast-node root"><div class="label">Account</div><strong>${esc(u.name)}</strong><div class="muted small-text">${esc(contractorName(inc.contractorId))}</div></div>
          <div class="arrow">▼</div>
          <div class="blast-node"><div class="label">Total files queried</div><strong class="red-text big">${inc.detection.files.toLocaleString("en-IN")}</strong></div>
          <div class="arrow">▼</div>
          <div class="blast-node warn"><div class="label">Sensitive files</div><strong class="orange-text big">${inc.detection.sensitive}</strong></div>
          <div class="arrow">▼</div>
          <div class="blast-split">
            <div class="blast-node"><div class="label">Projects</div><strong class="blue-text big">${inc.blast.projectCount}</strong></div>
            <div class="blast-node"><div class="label">Departments</div><strong class="purple-text big">${inc.blast.departments.length}</strong></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>📂 What was exposed</h3>
      ${categories}
      <p class="hint top-gap">Affected projects</p>
      <div class="tags">${projects}</div>
      <p class="hint top-gap">Affected departments</p>
      <div class="tags">${departments}</div>
    </div>

    <div class="card ai-card">
      <h3>🧠 AI Security Analysis</h3>
      <p class="hint">Sample analysis written for this prototype. A real version would call an AI service from a backend.</p>
      <div class="ai-grid">
        <div><h4>What happened</h4><p>${esc(inc.ai.narrative)}</p></div>
        <div><h4>Why it is suspicious</h4><ul class="plain-list">${whyList}</ul></div>
        <div><h4>Data affected</h4><p>${esc(inc.ai.data)}</p></div>
        <div><h4 class="green-text">Recommended action</h4><p>${esc(inc.ai.action)}</p></div>
      </div>
    </div>

    <div class="card">
      <h3>📜 Audit Log</h3>
      <table>
        <thead><tr><th>Time</th><th>Action</th><th>Officer</th><th>Details</th></tr></thead>
        <tbody>${audit}</tbody>
      </table>
    </div>`;
}

// Response actions (same rules as the original backend)
function doAction(action) {
  const inc = getIncident(currentIncidentId);
  if (!inc) return;

  let title = "";
  let detail = "";

  if (action === "FREEZE_SESSION") {
    inc.user.sessionStatus = "FROZEN";
    inc.status = "CONTAINED";
    title = "🔒 Session Frozen";
    detail = "Suspicious session for " + inc.user.name + " was terminated. Active tokens revoked.";
  } else if (action === "FORCE_REAUTH") {
    inc.user.sessionStatus = "REAUTH_REQUIRED";
    title = "🔐 Force Re-Authentication";
    detail = "Hardware-token re-authentication triggered for " + inc.user.name + ".";
  } else if (action === "ESCALATE") {
    inc.status = "INVESTIGATING";
    inc.severity = "Critical";
    title = "📢 Escalated to CERT-In / Ministry SOC";
    detail = "Priority escalation sent to the National Cyber Coordination Centre.";
  } else if (action === "REQUEST_AUDIT") {
    title = "📝 Contractor Forensic Audit Ordered";
    detail = "Inquiry letter sent to " + contractorName(inc.contractorId) + ".";
  } else if (action === "CONTAIN") {
    inc.status = "CONTAINED";
    title = "🛡️ Incident Contained";
    detail = "Network isolation and host containment completed.";
  } else if (action === "RESOLVE") {
    inc.status = "RESOLVED";
    title = "✅ Incident Resolved";
    detail = "Investigation closed with sign-off from the Government Security Officer.";
  }

  inc.auditLog.push({
    time: new Date().toLocaleTimeString("en-IN"),
    action: title,
    officer: "Government Security Officer",
    detail: detail
  });

  renderInvestigation();
  updateIncidentCount();
  showToast(title);
}

// =====================================================
// ATTACK SIMULATOR
// =====================================================
function renderSimSteps() {
  let html = "";
  simSteps.forEach(function (step) {
    let cls = "step-card";
    if (step.n < sim.current) cls += " done";
    if (step.n === sim.current) cls += " active level-" + threatLevel(step.threat);
    html += `
      <div class="${cls}">
        <div class="label">Step ${step.n}</div>
        <strong>${step.title}</strong>
      </div>`;
  });
  document.getElementById("sim-steps").innerHTML = html;
}

// Counts a number up (or down) smoothly
function animateNumber(id, from, to) {
  const el = document.getElementById(id);
  clearInterval(numberTimers[id]);
  let frame = 0;
  const frames = 20;
  numberTimers[id] = setInterval(function () {
    frame++;
    const value = Math.round(from + ((to - from) * frame) / frames);
    el.textContent = value.toLocaleString("en-IN");
    if (frame >= frames) clearInterval(numberTimers[id]);
  }, 40);
}

function addLog(entry) {
  const box = document.getElementById("sim-log");
  box.innerHTML += `<div class="${entry.cls}">[${esc(entry.time)}] ${esc(entry.msg)}</div>`;
  box.scrollTop = box.scrollHeight;
}

function clearSimTimers() {
  simTimers.forEach(function (t) { clearTimeout(t); });
  simTimers = [];
}

function runStep(n) {
  const step = simSteps[n - 1];
  clearSimTimers();

  animateNumber("sim-files", sim.files, step.files);
  animateNumber("sim-sensitive", sim.sensitive, step.sensitive);
  animateNumber("sim-threat", sim.threat, step.threat);
  sim.files = step.files;
  sim.sensitive = step.sensitive;
  sim.threat = step.threat;
  sim.current = n;

  const level = threatLevel(step.threat);
  document.getElementById("sim-velocity").textContent = step.velocity;
  const statusEl = document.getElementById("sim-status");
  statusEl.textContent = step.status;
  statusEl.className = "number small score-" + level;
  const meter = document.getElementById("sim-meter");
  meter.style.width = step.threat + "%";
  meter.className = "bar-fill fill-" + level;

  renderSimSteps();
  playStepSound(n);

  step.logs.forEach(function (entry, index) {
    simTimers.push(setTimeout(function () { addLog(entry); }, index * 700));
  });
}

function manualStep(n) {
  stopAutoPlay();
  runStep(n);
}

function stopAutoPlay() {
  clearInterval(autoTimer);
  autoTimer = null;
  document.getElementById("auto-btn").textContent = "▶ Auto-play demo";
}

function toggleAutoPlay() {
  if (autoTimer) {
    stopAutoPlay();
    return;
  }
  let n = 1;
  runStep(1);
  document.getElementById("auto-btn").textContent = "⏸ Stop auto-play";
  autoTimer = setInterval(function () {
    n++;
    runStep(n);
    if (n === 4) stopAutoPlay();
  }, 4500);
}

function resetSim() {
  stopAutoPlay();
  clearSimTimers();
  Object.keys(numberTimers).forEach(function (id) { clearInterval(numberTimers[id]); });
  sim = { current: 0, files: 0, sensitive: 0, threat: 0 };

  document.getElementById("sim-files").textContent = "0";
  document.getElementById("sim-sensitive").textContent = "0";
  document.getElementById("sim-threat").textContent = "0";
  document.getElementById("sim-velocity").textContent = "-";
  const statusEl = document.getElementById("sim-status");
  statusEl.textContent = "IDLE";
  statusEl.className = "number small";
  const meter = document.getElementById("sim-meter");
  meter.style.width = "0%";
  meter.className = "bar-fill";
  document.getElementById("sim-log").innerHTML = '<div class="log-info">[READY] Click a step (or Auto-play) to start the demo.</div>';
  renderSimSteps();
}

// =====================================================
// RESET + START
// =====================================================
function resetDemo() {
  if (!confirm("Reset all demo data? Added contractors and changes will be lost.")) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  contractors = clone(defaultContractors);
  incidents = clone(defaultIncidents);
  currentContractorId = null;
  currentIncidentId = null;
  resetSim();
  showView("dash");
  showToast("Demo data reset");
}

document.getElementById("today").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric"
});
buildAddForm();
renderSimSteps();
showView("dash");