// src/frontend/app/api/raidDetailAPI.js
const BASE = "/api";

async function j(r) {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function apiGetRaidById(id) {
  const res = await fetch(`${BASE}/raids/${id}`, { credentials: "include" });
  return j(res);
}

// Falls dein signups-Router ?raidId unterstützt:
export async function apiListSignupsForRaid(raidId) {
  const res = await fetch(`${BASE}/signups?raidId=${raidId}`, { credentials: "include" });
  return j(res);
}

// Pick/Unpick – über Raids-Routes
export async function apiPickSignup(raidId, signupId) {
  const res = await fetch(`${BASE}/raids/${raidId}/picks/${signupId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return j(res);
}
export async function apiUnpickSignup(raidId, signupId) {
  const res = await fetch(`${BASE}/raids/${raidId}/picks/${signupId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return j(res);
}
