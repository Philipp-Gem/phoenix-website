// src/backend/controllers/authController.js
// Thinner Controller, delegiert an services/authService

const authService = require("../services/authService.js");

/** GET /api/auth/login (oder /api/auth/discord/login) */
async function start(_req, res) {
  try {
    const url = authService.getAuthorizeUrl();
    return res.redirect(302, url);
  } catch (e) {
    console.error("[auth/start] error:", e);
    const back = authService.FRONTEND_URL || "/";
    return res.redirect(302, `${back}?oauth=failed`);
  }
}

/** GET /api/auth/callback?code=... */
async function callback(req, res) {
  try {
    const code = req.query?.code;
    if (!code) {
      const back = authService.FRONTEND_URL || "/";
      return res.redirect(302, `${back}?oauth=missing_code`);
    }

    const { user } = await authService.loginWithCode(code);

    // Session setzen
    req.session.user = user;

    // zurück zur App
    const back = authService.FRONTEND_URL || "/";
    return res.redirect(302, back);
  } catch (e) {
    console.error("[auth/callback] error:", e);
    const back = authService.FRONTEND_URL || "/";
    return res.redirect(302, `${back}?oauth=failed`);
  }
}

/** GET/POST /api/auth/logout */
async function logout(req, res) {
  try {
    req.session?.destroy?.(() => {});
  } catch {}
  const back = authService.FRONTEND_URL || "/";
  return res.redirect(302, back);
}

/** GET /api/auth/session – schlanker Session-Check */
async function session(req, res) {
  const u = req?.session?.user || null;
  return res.json({ ok: true, user: u });
}

module.exports = { start, callback, logout, session };
