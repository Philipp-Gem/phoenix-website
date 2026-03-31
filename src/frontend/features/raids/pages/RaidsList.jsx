// src/frontend/features/raids/pages/RaidsList.jsx
import React, { useMemo } from "react";
import { useRaidBootstrap } from "../hooks/useRaid";
import RaidCreateForm from "../components/RaidCreateForm";
import RaidListTable from "../components/RaidListTable";
import { buildRaidRowsVm } from "../VM/raidListVM";

export default function RaidsList() {
  const {
    me,
    leads,
    raids,
    loading,
    loadingRaids,
    error,
    createRaid,
    deleteRaid,
    canCreateRaid,
    canPickLead,
    canViewRaids,
  } = useRaidBootstrap();

  const rowsVm = useMemo(() => buildRaidRowsVm(raids, leads), [raids, leads]);

  if (!me) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Raids</h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Bitte einloggen, um Raids zu sehen.
        </div>
      </div>
    );
  }

  if (!canViewRaids) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Raids</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          Kein Zugriff. Du brauchst mindestens die Rolle <b>Lootbuddy</b>, um die Raid-Liste zu sehen.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Raids</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {canCreateRaid && (
          <section className="lg:col-span-12">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
              <div className="border-b border-zinc-800/60 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  Raid erstellen
                </h2>
              </div>
              <div className="px-5 py-5">
                <RaidCreateForm
                  me={me}
                  leads={leads}
                  canPickLead={canPickLead}
                  onCreate={createRaid}
                  loading={false}
                />
                {error?.create && (
                  <p className="mt-3 text-sm text-red-400">{String(error.create)}</p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="lg:col-span-12">
          <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
            <div className="border-b border-zinc-800/60 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Geplante Raids
              </h2>
            </div>

            <div className="px-2 py-3 sm:px-4">
              {loadingRaids ? (
                <div className="px-3 py-10 text-center text-zinc-400">Lädt …</div>
              ) : error ? (
                <div className="px-3 py-6 text-sm text-red-400">Fehler beim Laden der Raids.</div>
              ) : (
                <RaidListTable rows={rowsVm} onDelete={deleteRaid} />
              )}
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <div className="mt-4 text-center text-xs text-zinc-400">Daten werden geladen …</div>
      )}
    </div>
  );
}
