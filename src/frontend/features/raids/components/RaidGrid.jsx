// src/frontend/features/raids/components/RaidGrid.jsx
import React from "react";
import RaidCard from "./RaidCard";

/**
 * Props:
 * - raids: Array<Raid>
 * - onDelete?: (id) => void
 */
export default function RaidGrid({ raids = [], onDelete }) {
  if (!Array.isArray(raids) || raids.length === 0) {
    return (
      <div className="bb-empty bb-empty-muted">
        Keine Raids gefunden.
      </div>
    );
  }

  return (
    <div className="bb-grid bb-grid-raids">
      {raids.map((raid) => (
        <div key={raid.id} className="bb-grid-item">
          <RaidCard raid={raid} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
