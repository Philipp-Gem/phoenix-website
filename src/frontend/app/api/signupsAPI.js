// src/frontend/app/api/signupsAPI.js
async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}
function opts(method, body) {
  return {
    method,
    credentials: "include",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };
}

// Alle Signups zu einem Raid
export async function apiListRaidSignups(raidId) {
  const res = await fetch(`/api/signups/raids/${raidId}/signups?_=` + Date.now(), opts("GET"));
  const json = await safeJson(res);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP_${res.status}`);
  return json.signups || [];
}

// Pick via bevorzugter Route (POST /pick), Fallback PATCH
export async function apiPickSignup(signupId) {
  let res = await fetch(`/api/signups/${signupId}/pick`, opts("POST", { action: "pick" }));
  if (res.status === 404 || res.status === 405) {
    res = await fetch(`/api/signups/${signupId}`, opts("PATCH", { status: "PICKED", saved: true }));
  }
  const json = await safeJson(res);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP_${res.status}`);
  return json.signup || { id: signupId, status: "PICKED", saved: true };
}

// Unpick via bevorzugter Route (DELETE /pick), Fallback PATCH
export async function apiUnpickSignup(signupId) {
  let res = await fetch(`/api/signups/${signupId}/pick`, opts("DELETE"));
  if (res.status === 404 || res.status === 405) {
    res = await fetch(`/api/signups/${signupId}`, opts("PATCH", { status: "SIGNUPED", saved: false }));
  }
  const json = await safeJson(res);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP_${res.status}`);
  return json.signup || { id: signupId, status: "SIGNUPED", saved: false };
}
