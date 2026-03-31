// src/frontend/app/providers/AuthProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

/**
 * Rollen-Hierarchie:
 * viewer(0) < booster(1) < raidlead/admin(2) < owner(3)
 * Flags im User:
 * isOwner, isAdmin, isRaidlead, isBooster, isLootbuddy, roleLevel
 */

const AuthCtx = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function Provider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      setUser(json?.ok ? json.user || null : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Harte Navigation (wichtig für OAuth 302)
  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);
  const logout = useCallback(() => {
    window.location.href = "/api/auth/logout";
  }, []);

  // Abgeleitete Flags + Helpers (höhere Rollen implizieren Lootbuddy)
  const roleLevel = user?.roleLevel ?? 0;
  const isOwner = !!user?.isOwner || roleLevel >= 3;
  const isAdmin = !!user?.isAdmin || roleLevel >= 2;
  const isRaidlead = !!user?.isRaidlead || roleLevel >= 2;
  const isBooster = !!user?.isBooster || roleLevel >= 1;
  const isLootbuddy =
    !!user?.isLootbuddy || isBooster || isRaidlead || isAdmin || isOwner;

  const hasRole = (role) => {
    const r = String(role || "").toLowerCase();
    if (r === "owner") return isOwner;
    if (r === "admin") return isAdmin;
    if (r === "raidlead" || r === "lead") return isRaidlead;
    if (r === "booster") return isBooster;
    if (r === "lootbuddy" || r === "lootbuddys") return isLootbuddy;
    if (r === "viewer" || r === "user") return !!user;
    return false;
  };

  const hasAnyRole = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return !!user;
    return arr.some((r) => hasRole(r));
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      // flags
      roleLevel,
      isOwner,
      isAdmin,
      isRaidlead,
      isBooster,
      isLootbuddy,
      // actions
      login,
      logout,
      refresh,
      // helpers
      hasRole,
      hasAnyRole,
      hasAnyLevel: (min = 1) => roleLevel >= min,
    }),
    [
      user,
      loading,
      roleLevel,
      isOwner,
      isAdmin,
      isRaidlead,
      isBooster,
      isLootbuddy,
      login,
      logout,
      refresh,
    ]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/**
 * RequireAuth – Route-Guard-Wrapper
 *
 * Props (alle optional):
 * - requireLogin: boolean (default true)
 * - lootbuddy: boolean (wenn true → Lootbuddy oder höher nötig)
 * - role: "lootbuddy" | "booster" | "raidlead" | "admin" | "owner"
 * - anyOf: string[] (mind. eine dieser Rollen)
 * - minLevel: number (0..3) – 1=booster, 2=lead/admin, 3=owner
 */
export function RequireAuth({
  children,
  requireLogin = true,
  lootbuddy = false,
  role = null,
  anyOf = null,
  minLevel = null,
  Fallback = null,
}) {
  const { loading, user, login, isLootbuddy, roleLevel, hasRole, hasAnyRole } =
    useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">lädt Zugriff…</div>;
  }

  // Login-Pflicht
  if (requireLogin && !user) {
    return (
      <div className="mx-auto my-10 max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <div className="mb-2 text-zinc-100 font-medium">Bitte einloggen</div>
        <div className="mb-4 text-xs text-zinc-400">
          Du musst eingeloggt sein, um diese Seite zu sehen.
        </div>
        <button
          onClick={login}
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
        >
          Login mit Discord
        </button>
      </div>
    );
  }

  // Rollen-Anforderung bestimmen
  let allowed = true;
  let needMsg = "";

  if (lootbuddy) {
    allowed = isLootbuddy;
    needMsg =
      "Kein Zugriff. Du brauchst mindestens die Rolle Lootbuddy, um diese Seite zu sehen.";
  }

  if (allowed && role) {
    allowed = hasRole(role);
    if (!allowed)
      needMsg = `Kein Zugriff. Du brauchst mindestens die Rolle ${String(
        role
      )}.`;
  }

  if (allowed && Array.isArray(anyOf) && anyOf.length > 0) {
    allowed = hasAnyRole(anyOf);
    if (!allowed)
      needMsg = `Kein Zugriff. Erforderlich ist eine dieser Rollen: ${anyOf.join(
        ", "
      )}.`;
  }

  if (allowed && Number.isFinite(minLevel)) {
    allowed = roleLevel >= Number(minLevel);
    if (!allowed)
      needMsg = `Kein Zugriff. Benötigtes Level: ${minLevel}. Dein Level: ${roleLevel}.`;
  }

  if (!allowed) {
    if (Fallback) return <Fallback />;
    return (
      <div className="mx-auto my-10 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <div className="mb-2 text-zinc-100 font-medium">Zugriff verweigert</div>
        <div className="text-xs text-zinc-400">{needMsg}</div>
      </div>
    );
  }

  return <>{children}</>;
}

// 👉 Export-Kompatibilität: default **und** named
export { Provider as AuthProvider };
export default Provider;
