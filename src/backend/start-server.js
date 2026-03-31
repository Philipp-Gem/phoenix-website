// src/backend/start-server.js
// Small launcher that starts the webserver WITHOUT auto-initializing the Discord bot.
process.env.START_DISCORD = "false";
require("./server.js");
