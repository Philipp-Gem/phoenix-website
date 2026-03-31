// src/frontend/app/api/myRaidsAPI.js
export async function fetchMyRaidsAll() {
  const res = await fetch("/api/my-raids", {
    credentials: "include",
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Unexpected non-JSON from /api/my-raids: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || res.statusText || "UNKNOWN_ERROR");
  }
  // json: { ok:true, upcoming:{rostered,signups}, past:{rostered,signups} }
  return json;
}
