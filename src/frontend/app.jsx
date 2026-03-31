// src/frontend/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import MainLayout from "./app/layout/MainLayout.jsx";

// Auth-Guard
import { RequireAuth } from "./app/providers/AuthProvider.jsx";

// Pages
import RaidsList from "./features/raids/pages/RaidsList.jsx";
import RaidDetail from "./features/raids/pages/RaidDetail.jsx";
import PresetsList from "./features/presets/pages/PresetsList.jsx";
import CharsList from "./features/chars/pages/CharsList.jsx";
import UsersList from "./features/users/pages/UsersList.jsx";
import MyRaidsPage from "./features/my-raids/pages/MyRaids.jsx";

function NotFound() {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
      <div className="text-lg font-semibold text-white">404 – Seite nicht gefunden</div>
      <div className="mt-2 text-sm">Die aufgerufene URL existiert nicht.</div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <MainLayout>
        <Routes>
          {/* Startseite → direkt zur Raid-Liste */}
          <Route index element={<Navigate to="/raids" replace />} />

          {/* Raids */}
          <Route
            path="/raids"
            element={
              <RequireAuth>
                <RaidsList />
              </RequireAuth>
            }
          />
          <Route
            path="/raids/:id"
            element={
              <RequireAuth>
                <RaidDetail />
              </RequireAuth>
            }
          />

          {/* My Raids */}
          <Route
            path="/my-raids"
            element={
              <RequireAuth>
                <MyRaidsPage />
              </RequireAuth>
            }
          />

          {/* Presets */}
          <Route
            path="/presets"
            element={
              <RequireAuth>
                <PresetsList />
              </RequireAuth>
            }
          />

          {/* Chars */}
          <Route
            path="/chars"
            element={
              <RequireAuth>
                <CharsList />
              </RequireAuth>
            }
          />

          {/* Users */}
          <Route
            path="/users"
            element={
              <RequireAuth>
                <UsersList />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </div>
  );
}
