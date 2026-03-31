// src/backend/middlewares/auth.js
// Session-gestützte Auth (express-session muss im server.js konfiguriert sein)
function attachUser(req, _res, next) {
  req.user = req.session?.user || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

function requireRole(minLevel = 1) {
  return (req, res, next) => {
    const lvl = Number(req.user?.roleLevel ?? 0);
    if (lvl < minLevel) return res.status(403).json({ ok: false, error: "forbidden" });
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
