// src/frontend/app/api/presetsAPI.js
const API_BASE = import.meta?.env?.VITE_API_BASE || "";

async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  let url = `${API_BASE}/api${path}`;
  if (method === "GET") {
    url += (url.includes("?") ? "&" : "?") + `_=${Date.now()}`;
  }
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const err = new Error(body?.error || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function apiListPresets() {
  const data = await http(`/presets`, { method: "GET" });
  return Array.isArray(data?.presets) ? data.presets : [];
}

export async function apiGetPresetById(id) {
  const data = await http(`/presets/${id}`, { method: "GET" });
  // je nach Backend-Shape kann das Feld "preset" oder "data" heißen:
  return data?.preset ?? data?.data ?? data ?? null;
}

export async function apiCreatePreset(payload) {
  const data = await http(`/presets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data?.preset || null;
}

export async function apiUpdatePreset(id, payload) {
  const data = await http(`/presets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data?.preset || null;
}

export async function apiDeletePreset(id) {
  await http(`/presets/${id}`, { method: "DELETE" });
  return true;
}
