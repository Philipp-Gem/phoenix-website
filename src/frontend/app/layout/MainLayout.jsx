// src/frontend/app/layout/MainLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";
import TopNav from "./TopNav.jsx";

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();

  const username =
    user?.displayName || user?.username || user?.name || "—";
  const roleTag =
    user?.isOwner
      ? "Owner"
      : user?.isAdmin
      ? "Admin"
      : user?.isRaidlead || user?.isRaidLead
      ? "Raidlead"
      : "";

  return (
    <div className="min-h-full">
      <TopNav username={username} roleTag={roleTag} onLogout={logout} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
