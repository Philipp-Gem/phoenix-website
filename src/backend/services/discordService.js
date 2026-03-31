// src/backend/services/DiscordService.js
// 🔕 DEPRECATED: Bitte direkt "../discord-bot" verwenden.
// Diese Datei bleibt als Kompatibilitäts-Wrapper bestehen,
// bis alle Imports umgestellt sind.

let warned = false;
function deprecationNotice() {
  if (!warned) {
    console.warn("[DEPRECATION] src/backend/services/DiscordService.js -> bitte '../discord-bot' direkt importieren.");
    warned = true;
  }
}

try {
  deprecationNotice();
  // re-export der neuen, modularen Bot-API
  module.exports = require("../discord-bot");
} catch (e) {
  console.warn("[DiscordService] Fallback (Bot inaktiv):", e?.message || e);
  // Fallback-API, falls ENV/TOKEN fehlt – verhindert Crashes
  module.exports = {
    init: async () => false,
    syncRaid: async () => null,
  };
}
