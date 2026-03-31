// src/frontend/app/layout/TopNav.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-zinc-800 text-white"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800/70",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

function roleBadge(user) {
  if (!user) return null;
  const { isOwner, isAdmin, isRaidlead, isBooster, isLootbuddy } = user;
  let label = "User";
  let cls = "border-zinc-700/50 bg-zinc-800/50 text-zinc-300";
  if (isOwner)      { label = "Owner";    cls = "border-violet-500/30 bg-violet-500/10 text-violet-300"; }
  else if (isAdmin) { label = "Admin";    cls = "border-rose-500/30 bg-rose-500/10 text-rose-300"; }
  else if (isRaidlead) { label = "Lead";  cls = "border-sky-500/30 bg-sky-500/10 text-sky-300"; }
  else if (isBooster)  { label = "Booster"; cls = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"; }
  else if (isLootbuddy){ label = "Lootbuddy"; cls = "border-teal-500/30 bg-teal-500/10 text-teal-300"; }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${cls}`}>
      {label}
    </span>
  );
}

function cdnAvatarUrl(id, avatar, discriminator) {
  if (id && avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=64`;
  // Discord default avatars 0..4
  const idx = ((Number((discriminator ?? "").slice(-1)) || Number((id ?? "").slice(-1)) || 0) % 5);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export default function TopNav() {
  const { user, login, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);

  const displayName = user?.displayName || user?.username || user?.discordId || "Gast";

  // 1) Verwende vorhandene Felder aus dem Auth-Context
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    const direct = user.avatarUrl; // falls Backend absolute URL liefert
    const id = user.discordId || user.id;
    const av = user.avatar || user.discordAvatar || user.avatarHash;
    const discr = user.discriminator;
    if (direct)      setAvatarUrl(direct);
    else if (id)     setAvatarUrl(cdnAvatarUrl(id, av, discr));
    else             setAvatarUrl(null);
  }, [user]);

  // 2) Fallback: einmalig /api/auth/session holen, falls noch kein Avatar vorhanden
  useEffect(() => {
    let cancelled = false;
    if (avatarUrl || !user) return;
    (async () => {
      try {
        const r = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
        if (!r.ok) return;
        const s = await r.json();
        const id = s?.user?.id || s?.id || user?.discordId || user?.id;
        const av = s?.user?.avatar || s?.avatar;
        const discr = s?.user?.discriminator || s?.discriminator;
        if (!cancelled && id) setAvatarUrl(cdnAvatarUrl(id, av, discr));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [avatarUrl, user]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/70 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="mr-2 select-none text-sm font-semibold text-white">
            Boosting&nbsp;Bot
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <NavItem to="/raids">Raids</NavItem>
            <NavItem to="/my-raids">My&nbsp;Raids</NavItem>
            <NavItem to="/presets">Presets</NavItem>
            <NavItem to="/chars">Chars</NavItem>
            <NavItem to="/users">Users</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {roleBadge(user)}
              <div className="hidden text-sm text-zinc-300 sm:block">{displayName}</div>
              <img
                src={avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-zinc-700 object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={logout}
                className="rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="border-t border-zinc-800 bg-zinc-900/70 px-3 py-2 sm:hidden">
        <nav className="flex flex-wrap gap-2">
          <NavItem to="/raids">Raids</NavItem>
          <NavItem to="/my-raids">My&nbsp;Raids</NavItem>
          <NavItem to="/presets">Presets</NavItem>
          <NavItem to="/chars">Chars</NavItem>
          <NavItem to="/users">Users</NavItem>
        </nav>
      </div>
    </header>
  );
}
