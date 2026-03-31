import React, { useMemo, useState } from "react";

/**
 * Cleanes, kompaktes Strike-Formular.
 * Props:
 *  - onSubmit({ reason, weight, expiresAt }) -> Promise<void>
 */
export default function StrikeForm({ onSubmit }) {
  const [reason, setReason] = useState("");
  const [weight, setWeight] = useState(1);
  const [expiresAt, setExpiresAt] = useState(""); // <input type="datetime-local" />
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    return !!reason && weight >= 1 && weight <= 5 && !busy;
  }, [reason, weight, busy]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      // datetime-local liefert "YYYY-MM-DDTHH:mm"
      const expiresDate = expiresAt ? new Date(expiresAt) : undefined;
      await onSubmit({ reason: reason.trim(), weight, expiresAt: expiresDate });
      // reset nur Reason & optional Datum; Gewicht bleibt gleich (Quality of Life)
      setReason("");
      setExpiresAt("");
    } catch (e) {
      setErr(e?.message || "Fehler beim Vergeben des Strikes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Strike vergeben</div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {/* Reason */}
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Grund</label>
          <input
            className="w-full rounded-md bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 ring-1 ring-inset ring-zinc-700/60 focus:outline-none focus:ring-zinc-500"
            placeholder="z. B. NoShow, Flame, AFK, ..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Gewicht */}
        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Gewicht</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((w) => (
              <button
                type="button"
                key={w}
                onClick={() => setWeight(w)}
                className={[
                  "h-8 w-8 rounded-md text-sm ring-1 ring-inset transition",
                  w === weight
                    ? "bg-red-600/80 text-white ring-red-500"
                    : "bg-zinc-800/70 text-zinc-200 ring-zinc-700/60 hover:bg-zinc-700/70",
                ].join(" ")}
                aria-pressed={w === weight}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Ablauf (optional) */}
        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Ablauf (optional)</label>
          <input
            type="datetime-local"
            className="w-full rounded-md bg-zinc-800/70 px-2 py-2 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700/60 focus:outline-none focus:ring-zinc-500"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {err ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">{err}</div>
        ) : (
          <span className="text-xs text-zinc-400">Strikes sind sofort sichtbar.</span>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white ring-1 ring-inset ring-red-500 hover:bg-red-500 disabled:opacity-60"
        >
          Strike vergeben
        </button>
      </div>
    </form>
  );
}
