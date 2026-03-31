// src/frontend/app/api/charsAPI.js
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

export async function apiMyChars() {
  const data = await http(`/chars/my`, { method: "GET" });
  return Array.isArray(data?.chars) ? data.chars : [];
}

export async function apiCharsPreview({ name, realm, region = "eu" }) {
  const q = new URLSearchParams({ name, realm, region });
  const data = await http(`/chars/preview?${q.toString()}`, { method: "GET" });
  return data?.preview || null;
}

export async function apiCharsImport({ name, realm, region = "eu" }) {
  const data = await http(`/chars`, {
    method: "POST",
    body: JSON.stringify({ name, realm, region }),
  });
  return data?.char || null;
}

export async function apiDeleteChar(id) {
  await http(`/chars/${id}`, { method: "DELETE" });
  return true;
}

/* ---- NEW: Refresh ---- */
export async function apiRefreshChar(id) {
  const data = await http(`/chars/${id}/refresh`, { method: "POST" });
  return data?.char || null;
}

export async function apiRefreshStale(limit) {
  const q = new URLSearchParams();
  if (limit != null) q.set("limit", String(limit));
  const data = await http(`/chars/refresh/stale?${q.toString()}`, { method: "POST" });
  return Array.isArray(data?.results) ? data.results : [];
}
