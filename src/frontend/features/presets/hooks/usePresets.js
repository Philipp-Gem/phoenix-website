// src/frontend/features/presets/hooks/usePresets.js
import { useCallback, useEffect, useState } from "react";
import {
  apiListPresets,
  apiCreatePreset,
  apiUpdatePreset,
  apiDeletePreset,
} from "@app/api/presetsAPI";

function normalize(p) {
  return {
    id: p.id,
    name: p.name || "",
    tanks: p.tanks ?? 0,
    healers: p.healers ?? 0,
    dps: p.dps ?? 0,
    lootbuddies: p.lootbuddies ?? 0,
  };
}

export default function usePresets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiListPresets();
      setItems(list.map(normalize));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createPreset = useCallback(async (payload) => {
    const saved = await apiCreatePreset(payload);
    if (saved) setItems((prev) => [normalize(saved), ...prev]);
    return saved;
  }, []);

  const updatePreset = useCallback(async (id, payload) => {
    const saved = await apiUpdatePreset(id, payload);
    if (saved) setItems((prev) => prev.map((x) => (x.id === id ? normalize(saved) : x)));
    return saved;
  }, []);

  const deletePreset = useCallback(async (id) => {
    await apiDeletePreset(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    return true;
  }, []);

  return { items, loading, error, refresh, createPreset, updatePreset, deletePreset };
}
