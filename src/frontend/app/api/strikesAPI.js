// src/frontend/app/api/strikesAPI.js
export async function listStrikes({ userId, active = true } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (active) params.set("active", "1");

  const res = await fetch(`/api/strikes?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP_" + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "SERVER_ERROR");
  return json.strikes || [];
}

export async function createStrike({ userId, reason, weight = 1, expiresAt = null }) {
  const res = await fetch(`/api/strikes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, reason, weight, expiresAt }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "SERVER_ERROR");
  return json.strike;
}

export async function updateStrike(id, { reason, weight, expiresAt }) {
  const res = await fetch(`/api/strikes/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, weight, expiresAt }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "SERVER_ERROR");
  return json.strike;
}

export async function deleteStrike(id) {
  const res = await fetch(`/api/strikes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "SERVER_ERROR");
  return json.strike;
}
