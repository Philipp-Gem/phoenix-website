// src/frontend/features/raids/hooks/useRaid.js
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiListRaids,
  apiCreateRaid,
  apiUpdateRaid,
  apiDeleteRaid,
} from "@app/api/raidsAPI";
import { apiGetMe, apiGetLeads } from "@app/api/usersAPI";

function sortRaids(a, b) {
  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();
  if (da !== db) return da - db;
  return Number(a.id) - Number(b.id);
}

export function useRaidBootstrap() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRaids, setLoadingRaids] = useState(false);
  const [error, setError] = useState(null);

  // ---- Role helpers ------------------------------------------------------
  const roleLevel = me?.roleLevel ?? 0;
  const isOwner = !!me?.isOwner || roleLevel >= 3;
  const isAdmin = !!me?.isAdmin || roleLevel >= 2;
  const isRaidlead = !!me?.isRaidlead || roleLevel >= 1;
  const isLootbuddy = !!me?.isLootbuddy || me?.highestRole === "lootbuddy";

  const canCreateRaid = isOwner || isAdmin || isRaidlead;
  const canPickLead = isOwner || isAdmin;
  const canViewRaids = isLootbuddy || isRaidlead || isAdmin || isOwner;

  // ---- load parts --------------------------------------------------------
  const loadMe = useCallback(async () => {
    try {
      const res = await apiGetMe();
      setMe(res.user ?? null);
    } catch (e) {
      setMe(null);
      if (e?.status && e.status !== 401) setError(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await apiGetLeads();
      setLeads(res.leads || []);
    } catch (e) {
      if (e?.status && e.status !== 401) console.warn("[useRaidBootstrap] leads error:", e);
    }
  }, []);

  const loadRaids = useCallback(async () => {
    setLoadingRaids(true);
    try {
      const list = await apiListRaids();
      setRaids(Array.isArray(list) ? list.slice().sort(sortRaids) : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoadingRaids(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadMe(), loadLeads(), loadRaids()]);
    setLoading(false);
  }, [loadMe, loadLeads, loadRaids]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ---- mutations ---------------------------------------------------------
  const createRaid = useCallback(async (payload) => {
    const raid = await apiCreateRaid(payload);
    setRaids((prev) => [raid, ...(prev || [])].sort(sortRaids));
    return { ok: true, raid }; // <<< wichtig für dein useRaidCreateForm
  }, []);

  const updateRaid = useCallback(async (id, patch) => {
    const raid = await apiUpdateRaid(id, patch);
    setRaids((prev) =>
      (prev || []).map((r) => (String(r.id) === String(id) ? raid : r)).sort(sortRaids)
    );
    return { ok: true, raid };
  }, []);

  const deleteRaid = useCallback(async (id) => {
    await apiDeleteRaid(id);
    setRaids((prev) => (prev || []).filter((r) => String(r.id) !== String(id)));
    return { ok: true };
  }, []);

  return {
    me,
    leads,
    raids,
    loading,
    loadingRaids,
    error,

    // role info & permissions
    roleLevel,
    isOwner,
    isAdmin,
    isRaidlead,
    isLootbuddy,
    canCreateRaid,
    canPickLead,
    canViewRaids,

    // actions
    refreshAll,
    createRaid,
    updateRaid,
    deleteRaid,
  };
}

export default useRaidBootstrap;
