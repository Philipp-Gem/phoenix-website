import React, { useState } from "react";

/**
 * Reusable Panel, das dein Backend /api/roster/post aufruft.
 * Nicht-destruktiv: Kann überall eingebunden werden, erwartet nur { raid }.
 */
export default function PostRosterPanel({ raid }) {
  const [pingAllSaved, setPingAllSaved] = useState(true);
  const [pingRoleIds, setPingRoleIds] = useState(""); // Komma-getrennt
  const [pingUserIds, setPingUserIds] = useState(""); // Komma-getrennt
  const [posting, setPosting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");

  async function handlePost() {
    if (!raid?.id) return;

    const roleIds = pingRoleIds.split(",").map(v => v.trim()).filter(Boolean);
    const userIds = pingUserIds.split(",").map(v => v.trim()).filter(Boolean);

    setPosting(true);
    setError("");
    setResultUrl("");

    try {
      const res = await fetch("/api/roster/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          raidId: raid.id,
          pingAllSaved,
          pingRoleIds: roleIds,
          pingUserIds: userIds,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Roster post failed");
      setResultUrl(data.messageUrl || "");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
      <div className="mb-2 text-sm font-semibold text-amber-300">
        Roster im Discord posten
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={pingAllSaved}
            onChange={(e) => setPingAllSaved(e.target.checked)}
          />
          <span className="text-sm text-zinc-200">Alle SAVED Spieler erwähnen</span>
        </label>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
          <div className="mb-1 text-xs font-medium text-zinc-400">
            Rollen-IDs pingen (optional, Komma getrennt)
          </div>
          <input
            type="text"
            className="w-full rounded-lg bg-zinc-950/60 p-2 text-sm outline-none"
            placeholder="z.B. 1421929039941210112,14219..."
            value={pingRoleIds}
            onChange={(e) => setPingRoleIds(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
          <div className="mb-1 text-xs font-medium text-zinc-400">
            User-IDs pingen (optional, Komma getrennt)
          </div>
          <input
            type="text"
            className="w-full rounded-lg bg-zinc-950/60 p-2 text-sm outline-none"
            placeholder="z.B. 123,456"
            value={pingUserIds}
            onChange={(e) => setPingUserIds(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handlePost}
          disabled={posting}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {posting ? "Poste..." : "Roster posten"}
        </button>

        {resultUrl ? (
          <a
            href={resultUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-amber-300 underline hover:text-amber-200"
          >
            Zur Discord-Nachricht
          </a>
        ) : null}

        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
