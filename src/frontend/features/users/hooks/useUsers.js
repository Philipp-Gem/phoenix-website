// src/frontend/features/users/hooks/useUsers.js
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Owner/Admin: Lädt die Userliste von /api/users (optional mit ?q=...).
 * Handhabt Loading/Error, Abbrechen bei schnellen Eingaben und Reload.
 *
 * Verwendung:
 * const { query, setQuery, users, loading, error, reload } = useUsers();
 * <input value={query} onChange={(e)=>setQuery(e.target.value)} />
 */
export function useUsers(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Für Abort bei schnellen Eingaben
  const controllerRef = useRef(null);

  const fetchUsers = useCallback(
    async (q) => {
      // laufende Anfrage abbrechen
      if (controllerRef.current) controllerRef.current.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        const res = await fetch(`/api/users${qs}`, {
          credentials: "include",
          signal: ctrl.signal,
        });

        // JSON versuchen, auch bei Fehlern (damit {ok:false,error} greift)
        let json;
        try {
          json = await res.json();
        } catch {
          json = { ok: false, error: `HTTP_${res.status}` };
        }

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP_${res.status}`);
        }

        setUsers(Array.isArray(json.users) ? json.users : []);
      } catch (e) {
        if (e.name !== "AbortError") setError(e);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(query);
    // cleanup
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [fetchUsers, query]);

  const reload = useCallback(() => fetchUsers(query), [fetchUsers, query]);

  return { query, setQuery, users, loading, error, reload };
}
