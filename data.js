// =====================================================
// data.js  -  ALL FAKE (SYNTHETIC) DATA LIVES HERE
// This file replaces the backend / database.
// =====================================================

// The 6 security factors + how much each one counts towards the score
const FACTORS = [
  { key: "mfa",        label: "MFA Adoption",       icon: "🔑", weight: 0.22, tip: "Enforce MFA on all contractor accounts" },
  { key: "patch",      label: "Patch Compliance",   icon: "🩹", weight: 0.20, tip: "Patch the remaining vulnerable endpoints" },
  { key: "training",   label: "Employee Training",  icon: "🎓", weight: 0.15, tip: "Run mandatory phishing-awareness training" },
  { key: "encryption", label: "Data Encryption",    icon: "🔒", weight: 0.15, tip: "Encrypt data at rest and in transit" },
  { key: "access",     label: "Access Control",     icon: "🚪", weight: 0.15, tip: "Apply least-privilege and review access rights" },
  { key: "audits",     label: "Security Audits",    icon: "📝", weight: 0.08, tip: "Schedule an independent security audit" }
];

// Incident history gives a bonus or a penalty to the score
const INCIDENT_BONUS = { Good: 5, Moderate: 0, Poor: -8, Critical: -15 };

// ---------------- CONTRACTORS ----------------
const defaultContractors = [
  { id: "CTR-001", name: "ABC Infrastructure Ltd", dept: "Ministry of Road Transport", project: "NH-44 Highway Expansion",
    factors: { mfa: 86, patch: 82, training: 91, encryption: 92, access: 80, audits: 88, incident: "Good" } },
  { id: "CTR-002", name: "Bharat Digital Systems", dept: "Ministry of Defence", project: "Secure Comms Backbone",
    factors: { mfa: 98, patch: 97, training: 96, encryption: 99, access: 97, audits: 95, incident: "Good" } },
  { id: "CTR-003", name: "DEF Power Systems", dept: "Ministry of Power", project: "Northern Grid SCADA Upgrade",
    factors: { mfa: 52, patch: 48, training: 60, encryption: 70, access: 62, audits: 55, incident: "Moderate" } },
  { id: "CTR-004", name: "XYZ Technologies India", dept: "MeitY", project: "State Resident Data Hub",
    factors: { mfa: 79, patch: 74, training: 77, encryption: 84, access: 75, audits: 79, incident: "Good" } },
  { id: "CTR-005", name: "National Engineering Solutions", dept: "Ministry of Railways", project: "Delhi-Meerut RRTS Signaling",
    factors: { mfa: 65, patch: 58, training: 66, encryption: 77, access: 68, audits: 62, incident: "Good" } },
  { id: "CTR-006", name: "Garuda Aerospace", dept: "Department of Space", project: "Ground Station Telemetry",
    factors: { mfa: 94, patch: 91, training: 93, encryption: 97, access: 89, audits: 92, incident: "Good" } },
  { id: "CTR-007", name: "Sagarmatha Port Logistics", dept: "Ports & Shipping", project: "Port Automation Phase 2",
    factors: { mfa: 46, patch: 43, training: 57, encryption: 62, access: 52, audits: 47, incident: "Moderate" } },
  { id: "CTR-008", name: "Pratham Cloud Networks", dept: "Health & Family Welfare", project: "National Health Data Cloud",
    factors: { mfa: 75, patch: 73, training: 79, encryption: 83, access: 71, audits: 77, incident: "Good" } }
];

// ---------------- INCIDENTS ----------------
const defaultIncidents = [
  {
    id: "INC-2026-8942",
    contractorId: "CTR-001",
    title: "Mass Data Access Surge & Off-Hours Exfiltration",
    severity: "Critical",
    threatScore: 96,
    status: "DETECTED",
    user: {
      name: "Rahul Sharma", employeeId: "ABC-EMP-7842", role: "Senior GIS Database Engineer",
      project: "National Highway NH-44 Expansion", device: "Dell Latitude 7420",
      ip: "103.24.188.42 (synthetic)", loginTime: "11:28 PM IST", normalFiles: 32, sessionStatus: "ACTIVE"
    },
    detection: { files: 1247, sensitive: 184, minutes: 19 },
    anomalies: [
      { factor: "Velocity Spike", detail: "1,247 files in 19 min (baseline: 32 files/day)", risk: "+35 pts" },
      { factor: "Off-Hours Activity", detail: "Activity at 11:42 PM, outside the 9 AM - 7 PM shift", risk: "+25 pts" },
      { factor: "Sensitive Classification", detail: "184 Restricted/Confidential blueprints queried", risk: "+22 pts" },
      { factor: "Cross-Project Querying", detail: "Read attempts on 11 non-assigned repositories", risk: "+14 pts" }
    ],
    blast: {
      categories: [
        { name: "Engineering Blueprints (.pdf, .dwg)", count: 480, sensitive: 94 },
        { name: "Financial & Supplier Bids (.xlsx, .csv)", count: 310, sensitive: 42 },
        { name: "SCADA Telemetry Schematics (.dxf)", count: 215, sensitive: 36 },
        { name: "Contract Documents & NDAs (.pdf)", count: 242, sensitive: 12 }
      ],
      projects: [
        "NH-44 Highway Expansion & Bridge Schematics (MoRTH)",
        "Zojila Pass Tunnel Surveillance (MoRTH)",
        "Northern Grid SCADA Load Balancing (Power)",
        "Naval Logistics Depot Inventory (MoD)",
        "Delhi-Meerut RRTS Signaling (Railways)",
        "Aadhaar Gateway Microservice Spec (MeitY)"
      ],
      departments: ["Ministry of Road Transport", "Ministry of Power", "Ministry of Defence"],
      projectCount: 12
    },
    timeline: [
      { time: "11:28 PM", event: "User logged in via VPN node DL-04 with a valid credential", count: 0 },
      { time: "11:42 PM", event: "Normal-looking session: 32 project files accessed", count: 32 },
      { time: "11:44 PM", event: "Automated script: 87 files queried in 90 seconds", count: 87 },
      { time: "11:47 PM", event: "Bulk query on Bridge Engineering repository", count: 312 },
      { time: "11:52 PM", event: "Cross-ministry folder traversal", count: 700 },
      { time: "12:01 AM", event: "Peak spike. Anomaly threshold tripped", count: 1247 }
    ],
    ai: {
      narrative: "This account normally opens about 32 files a day during office hours. From 11:42 PM it opened 1,247 files in 19 minutes, including 184 sensitive engineering and SCADA files.",
      why: "1. Access happened outside the normal shift.\n2. Retrieval speed was about 65 files per minute (automated).\n3. Files outside the assigned NH-44 contract were read.\n4. Many files were highly sensitive.",
      data: "184 sensitive documents across Road Transport, Power and Defence projects. No external transfer confirmed yet, but the files were staged locally.",
      action: "Freeze the session, revoke the active tokens and order a forensic audit of the contractor."
    },
    auditLog: [
      { time: "12:01:05 AM", action: "System Alert Generated", officer: "RakshaSetu Anomaly Engine", detail: "Threat Score 96 / CRITICAL triggered" }
    ]
  },
  {
    id: "INC-2026-8941",
    contractorId: "CTR-004",
    title: "Unusual Geographical Login & Concurrent Session Surge",
    severity: "High",
    threatScore: 78,
    status: "INVESTIGATING",
    user: {
      name: "Kavita Chawla", employeeId: "XYZ-USR-3104", role: "Database Administrator",
      project: "State Resident Data Hub Connector", device: "MacBook Pro M2",
      ip: "185.220.101.5 (synthetic anonymizer)", loginTime: "09:15 PM IST", normalFiles: 45, sessionStatus: "ACTIVE"
    },
    detection: { files: 340, sensitive: 52, minutes: 30 },
    anomalies: [
      { factor: "Anomalous IP Origin", detail: "Anonymizer IP, different from the usual Bengaluru office", risk: "+30 pts" },
      { factor: "Concurrent Session", detail: "Same account active in Pune and Frankfurt at once", risk: "+28 pts" },
      { factor: "Privilege Querying", detail: "Queried citizen identity schema exports", risk: "+20 pts" }
    ],
    blast: {
      categories: [
        { name: "Citizen Services Database Schema (.sql)", count: 180, sensitive: 40 },
        { name: "API Gateway Authentication Keys (.json)", count: 160, sensitive: 12 }
      ],
      projects: [
        "State Resident Data Hub Connector (MeitY)",
        "Unified Citizen Services Portal Backend (MeitY)",
        "DigiLocker Integration Webhooks (MeitY)"
      ],
      departments: ["MeitY"],
      projectCount: 3
    },
    timeline: [
      { time: "09:15 PM", event: "Login from a new, anonymized IP address", count: 0 },
      { time: "09:22 PM", event: "Second concurrent session opened from another country", count: 40 },
      { time: "09:35 PM", event: "Identity schema exports queried", count: 180 },
      { time: "09:45 PM", event: "API key files read. Alert raised", count: 340 }
    ],
    ai: {
      narrative: "The same account is signed in from two countries at once, using an anonymizing network. That pattern usually means stolen credentials.",
      why: "1. The login IP is not the usual office network.\n2. Two sessions are active at the same time in different countries.\n3. Identity schema files were queried, which is not part of the normal job.",
      data: "52 sensitive files related to citizen identity services.",
      action: "Force re-authentication with a hardware token and review the account's recent activity."
    },
    auditLog: [
      { time: "09:45:10 PM", action: "System Alert Generated", officer: "RakshaSetu Anomaly Engine", detail: "Threat Score 78 / HIGH triggered" },
      { time: "09:52:31 PM", action: "Escalated to Ministry SOC", officer: "Government Security Officer", detail: "Investigation opened by the MeitY security team" }
    ]
  },
  {
    id: "INC-2026-8940",
    contractorId: "CTR-003",
    title: "Privileged Access From Unmanaged Device",
    severity: "High",
    threatScore: 71,
    status: "DETECTED",
    user: {
      name: "Anil Verma", employeeId: "DEF-ENG-2210", role: "SCADA Integration Lead",
      project: "Northern Grid SCADA Upgrade", device: "Unknown (not registered)",
      ip: "49.36.12.88 (synthetic)", loginTime: "02:10 AM IST", normalFiles: 20, sessionStatus: "ACTIVE"
    },
    detection: { files: 126, sensitive: 31, minutes: 25 },
    anomalies: [
      { factor: "Unmanaged Device", detail: "Device not registered with the contractor asset list", risk: "+30 pts" },
      { factor: "Failed Logins", detail: "9 failed attempts before a successful login", risk: "+20 pts" },
      { factor: "Off-Hours Activity", detail: "Login at 2:10 AM, outside normal hours", risk: "+21 pts" }
    ],
    blast: {
      categories: [
        { name: "SCADA Configuration Files (.cfg)", count: 70, sensitive: 22 },
        { name: "Substation Maintenance Reports (.pdf)", count: 56, sensitive: 9 }
      ],
      projects: [
        "Northern Grid SCADA Upgrade (Power)",
        "Regional Substation Monitoring (Power)"
      ],
      departments: ["Ministry of Power"],
      projectCount: 2
    },
    timeline: [
      { time: "02:01 AM", event: "9 failed login attempts from a new device", count: 0 },
      { time: "02:10 AM", event: "Successful login with valid credentials", count: 5 },
      { time: "02:18 AM", event: "SCADA configuration files opened", count: 70 },
      { time: "02:35 AM", event: "Maintenance reports exported. Alert raised", count: 126 }
    ],
    ai: {
      narrative: "Several failed logins were followed by a successful one from a device the contractor does not know about, then SCADA files were opened.",
      why: "1. Unknown device.\n2. Password guessing pattern before login.\n3. Access during the night to critical grid files.",
      data: "31 sensitive configuration and maintenance files for the northern power grid.",
      action: "Force re-authentication, block the unmanaged device and request a contractor audit."
    },
    auditLog: [
      { time: "02:35:44 AM", action: "System Alert Generated", officer: "RakshaSetu Anomaly Engine", detail: "Threat Score 71 / HIGH triggered" }
    ]
  }
];

// ---------------- ATTACK SIMULATOR STEPS ----------------
const simSteps = [
  { n: 1, title: "Normal Baseline", files: 31, sensitive: 2, velocity: "1 file / min", threat: 14, status: "NORMAL",
    logs: [
      { time: "11:30 PM", msg: "Rahul Sharma signed in through the standard VPN", cls: "log-info" },
      { time: "11:35 PM", msg: "Opened routine NH-44 highway survey documents", cls: "log-info" },
      { time: "11:40 PM", msg: "Baseline daily activity confirmed (31 files)", cls: "log-info" }
    ] },
  { n: 2, title: "Suspicious Surge", files: 400, sensitive: 45, velocity: "40 files / min", threat: 68, status: "ELEVATED SUSPICION",
    logs: [
      { time: "11:42 PM", msg: "Sudden burst query across many subdirectories", cls: "log-warn" },
      { time: "11:44 PM", msg: "Automated script suspected: 400 files in 90 seconds", cls: "log-warn" },
      { time: "11:46 PM", msg: "Velocity warning: far above the 32 files/day baseline", cls: "log-warn" }
    ] },
  { n: 3, title: "Critical Exfiltration", files: 1247, sensitive: 184, velocity: "65 files / min", threat: 96, status: "CRITICAL ALERT",
    logs: [
      { time: "11:52 PM", msg: "Cross-ministry folder traversal detected", cls: "log-bad" },
      { time: "11:58 PM", msg: "Access keys and SCADA schematics queried", cls: "log-bad" },
      { time: "12:01 AM", msg: "🚨 CRITICAL: 1,247 files fetched. Threat Score 96/100", cls: "log-bad" }
    ] },
  { n: 4, title: "Freeze & Contain", files: 1247, sensitive: 184, velocity: "0 files / min", threat: 20, status: "CONTAINED",
    logs: [
      { time: "12:02 AM", msg: "Officer clicked Freeze Session", cls: "log-good" },
      { time: "12:02 AM", msg: "VPN and OAuth tokens revoked", cls: "log-good" },
      { time: "12:03 AM", msg: "🔒 Session frozen. Status: CONTAINED", cls: "log-good" }
    ] }
];