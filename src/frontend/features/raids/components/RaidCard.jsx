// src/frontend/features/raids/components/RaidCard.jsx
import React, { useMemo } from "react";

function fmtDateTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RaidCard({ raid, onDelete }) {
  const data = useMemo(() => {
    const r = raid || {};
    return {
      id: r.id,
      title: r.title || "-",
      difficulty: r.difficulty || "-",
      lootType: r.lootType || "-",
      bosses: r.bosses ?? "-",
      thdlb: `${r.tanks ?? 0}/${r.healers ?? 0}/${r.dps ?? 0}/${r.lootbuddies ?? 0}`,
      date: fmtDateTime(r.date),
      lead: r.lead || r.leadName || "-",
      detailUrl: r.detailUrl || (r.id ? `/raids/${r.id}` : "#"),
    };
  }, [raid]);

  return (
    <div className="bb-card bb-card-raid">
      <div className="bb-card-header">
        <div className="bb-card-title">{data.title}</div>
        <div className="bb-card-subtitle">
          <span className="bb-badge">{data.difficulty}</span>
          <span className="bb-badge">{data.lootType}</span>
          <span className="bb-badge">Bosse: {data.bosses}</span>
        </div>
      </div>

      <div className="bb-card-body">
        <div className="bb-row">
          <div className="bb-col bb-col-6">
            <div className="bb-meta">
              <div className="bb-meta-label">Datum</div>
              <div className="bb-meta-value">{data.date}</div>
            </div>
          </div>
          <div className="bb-col bb-col-6">
            <div className="bb-meta">
              <div className="bb-meta-label">T/H/D/LB</div>
              <div className="bb-meta-value">{data.thdlb}</div>
            </div>
          </div>
        </div>

        <div className="bb-row">
          <div className="bb-col bb-col-12">
            <div className="bb-meta">
              <div className="bb-meta-label">Lead</div>
              <div className="bb-meta-value">{data.lead}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bb-card-footer bb-actions bb-actions-between">
        <a href={data.detailUrl} className="bb-btn bb-btn-secondary bb-btn-sm">
          Details
        </a>
        {onDelete && (
          <button
            className="bb-btn bb-btn-danger bb-btn-sm"
            onClick={() => onDelete(data.id)}
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
