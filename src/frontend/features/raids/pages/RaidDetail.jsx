import React from "react";
import { useParams } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail.js";
import RaidDetailView from "../components/RaidDetailView.jsx";

export default function RaidDetail() {
  const { id } = useParams();
  const {
    raid,
    grouped,
    caps,
    counts,
    checklist,
    canManage,
    pick,
    unpick,
    busyIds,
    // je nach Hook-Implementierung kann es "refetch" oder "reload" geben
    refetch,
    reload,
  } = useRaidDetail(Number(id));

  const onReload = React.useCallback(() => {
    const fn = refetch || reload;
    return typeof fn === "function" ? fn() : Promise.resolve();
  }, [refetch, reload]);

  if (!raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Lädt …
      </div>
    );
  }

  return (
    <RaidDetailView
      raid={raid}
      grouped={grouped}
      caps={caps}
      counts={counts}
      checklist={checklist}
      canManage={canManage}
      pick={pick}
      unpick={unpick}
      busyIds={busyIds}
      onReload={onReload}        
    />
  );
}
