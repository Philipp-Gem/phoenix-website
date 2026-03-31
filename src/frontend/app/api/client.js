// fetch-Wrapper (immer mit Credentials), Fehler werden als Error geworfen
export async function apiGet(path) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
export async function apiJson(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
export const apiPost = (p, b) => apiJson("POST", p, b);
export const apiPatch = (p, b) => apiJson("PATCH", p, b);
export const apiDelete = (p) => apiJson("DELETE", p);
