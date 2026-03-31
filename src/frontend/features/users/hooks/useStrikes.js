// src/frontend/features/users/hooks/useStrikes.js
import { useCallback, useEffect, useState } from "react";
import { listStrikes, createStrike, deleteStrike, updateStrike } from "../../../app/api/strikesAPI";

export function useStrikes(userId, { activeOnly = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listStrikes({ userId, active: activeOnly });
      setItems(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId, activeOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async ({ reason, weight = 1, expiresAt = null }) => {
      const s = await createStrike({ userId, reason, weight, expiresAt });
      setItems((prev) => [s, ...prev]);
      return s;
    },
    [userId]
  );

  const remove = useCallback(async (id) => {
    await deleteStrike(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const edit = useCallback(async (id, payload) => {
    const s = await updateStrike(id, payload);
    setItems((prev) => prev.map((x) => (x.id === id ? s : x)));
    return s;
  }, []);

  return { items, loading, error, reload, add, remove, edit };
}
