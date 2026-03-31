// src/frontend/features/presets/pages/PresetsList.jsx
import React, { useRef, useState } from "react";
import usePresets from "../hooks/usePresets";
import PresetsForm from "../components/PresetsForm.jsx";

export default function PresetsList() {
  const { items, loading, error, createPreset, updatePreset, deletePreset } = usePresets();
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState(null);
  const formRef = useRef(null); // 👉 Ref auf das Formular

  const currentEdit = items.find((x) => x.id === editId);

  async function handleCreate(payload) {
    setFormError(null);
    try {
      await createPreset(payload);
    } catch (e) {
      setFormError(e?.message || "Erstellen fehlgeschlagen");
    }
  }

  async function handleUpdate(payload) {
    if (!editId) return;
    setFormError(null);
    try {
      await updatePreset(editId, payload);
      setEditId(null);
    } catch (e) {
      setFormError(e?.message || "Speichern fehlgeschlagen");
    }
  }

  function cancelEdit() {
    setEditId(null);
    setFormError(null);
  }

  // programmatischer Submit fürs „Speichern“-Button in der Tabelle
  function submitFromRow() {
    formRef.current?.submit?.();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Presets</h1>

      <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {editId ? "Preset bearbeiten" : "Neues Preset anlegen"}
          </h2>
        </div>
        <div className="px-5 py-4">
          {formError && (
            <div className="mb-3 rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
              {String(formError)}
            </div>
          )}
          <PresetsForm
            ref={formRef}                                // 👉 Ref an die Form
            key={editId ? `edit-${editId}` : "create"}   // remount bei Moduswechsel
            mode={editId ? "edit" : "create"}
            initial={currentEdit}
            onSubmit={editId ? handleUpdate : handleCreate}
            onCancel={cancelEdit}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Übersicht</h2>
        </div>

        <div className="px-3 py-3">
          {loading ? (
            <div className="px-3 py-10 text-center text-zinc-400">Lädt …</div>
          ) : error ? (
            <div className="px-3 py-6 text-sm text-red-400">Fehler: {String(error.message || error)}</div>
          ) : !Array.isArray(items) || items.length === 0 ? (
            <div className="px-3 py-10 text-center text-zinc-400">Noch keine Presets vorhanden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Tanks</th>
                    <th className="px-4 py-2 text-left">Healer</th>
                    <th className="px-4 py-2 text-left">DPS</th>
                    <th className="px-4 py-2 text-left">Lootbuddys</th>
                    <th className="px-4 py-2 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {items.map((p) => {
                    const isEditing = p.id === editId;
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2">{p.tanks}</td>
                        <td className="px-4 py-2">{p.healers}</td>
                        <td className="px-4 py-2">{p.dps}</td>
                        <td className="px-4 py-2">{p.lootbuddies}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={() => setEditId(p.id)}
                                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => deletePreset(p.id)}
                                  className="rounded-md border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30"
                                >
                                  Löschen
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={submitFromRow}
                                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                  Abbrechen
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
