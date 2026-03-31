// src/frontend/features/chars/hooks/useMyChars.js
import { useCallback, useEffect, useState } from "react";
import {
  apiMyChars,
  apiCharsPreview,
  apiCharsImport,
  apiDeleteChar,
  apiRefreshChar,
  apiRefreshStale,
} from "@app/api/charsAPI";

export function useMyChars() {
  const [chars, setChars]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiMyChars();
      setChars(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const preview = useCallback(async (params) => apiCharsPreview(params), []);

  const importChar = useCallback(async ({ name, realm, region }) => {
    const saved = await apiCharsImport({ name, realm, region });
    if (saved) {
      setChars((prev) => {
        const key = (c) => `${c.userId}:${c.name.toLowerCase()}:${c.realm.toLowerCase()}`;
        const filtered = prev.filter((c) => key(c) !== key(saved));
        return [saved, ...filtered];
      });
    }
    return saved;
  }, []);

  const removeChar = useCallback(async (id) => {
    await apiDeleteChar(id);
    setChars((prev) => prev.filter((c) => String(c.id) !== String(id)));
  }, []);

  /* ---- NEW: Refresh helpers ---- */
  const refreshCharNow = useCallback(async (id) => {
    const updated = await apiRefreshChar(id);
    if (updated) {
      setChars((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    }
    return updated;
  }, []);

  const refreshAllStale = useCallback(async (limit) => {
    await apiRefreshStale(limit);
    await refresh();
  }, [refresh]);

  return {
    chars, loading, error, refresh,
    preview, importChar, removeChar,
    refreshCharNow, refreshAllStale,
  };
}

export default useMyChars;
