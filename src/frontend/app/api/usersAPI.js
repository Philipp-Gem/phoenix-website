// src/frontend/app/api/usersAPI.js
// Frontend-HTTP Wrapper für User/Leads/Adminliste

const API_BASE = import.meta?.env?.VITE_API_BASE || "";

/** interner Fetch-Helper mit Credentials und Cache-Bust */
async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();

  let url = `${API_BASE}/api${path}`;
  if (method === "GET") {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}_=${Date.now()}`;
  }

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (res.status === 304) return {};
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const msg = body?.error || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

/** Session-User – Backend liefert { ok, user } */
export async function apiGetMe() {
  return http(`/users/me`, { method: "GET" });
}

/** Raidleads – Backend liefert { ok, leads } */
export async function apiGetLeads() {
  return http(`/users/leads`, { method: "GET" });
}

/** ✨ Adminliste inkl. Chars & Historie – { ok, users } */
export async function apiListUsers(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await http(`/users${qs}`, { method: "GET" });
  return Array.isArray(data?.users) ? data.users : [];
}
