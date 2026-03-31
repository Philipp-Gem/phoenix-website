// src/backend/jobs/charRefreshJob.js
// Intervall-Job mit sichtbarem Logging & Parametern pro Run.

const svc = require("../services/charRefreshService.js");

const DEFAULT_INTERVAL = Number(process.env.CHAR_REFRESH_INTERVAL_MS || 1000 * 60 * 15);

let _timer = null;
let _busy = false;
let _lastRun = null;
let _lastResult = null;
let _intervalMs = DEFAULT_INTERVAL;

async function runOnce(opts = {}) {
  if (_busy) return { ok: false, error: "ALREADY_RUNNING" };
  _busy = true;
  _lastRun = new Date();
  const tag = _lastRun.toISOString();

  const limit = Number(opts.limit || process.env.CHAR_REFRESH_BATCH || 10);
  const staleMs =
    opts.staleMs !== undefined
      ? Number(opts.staleMs)
      : Number(process.env.CHAR_REFRESH_STALE_MS || 1000 * 60 * 60 * 6);

  console.log(`[CRON][${tag}] Start runOnce(limit=${limit}, staleMs=${staleMs})`);
  try {
    const res = await svc.refreshStale({ limit, staleMs });
    const ok = res.filter((r) => r.ok).length;
    const fail = res.length - ok;
    _lastResult = { at: _lastRun, count: res.length, ok, fail, details: res };
    console.log(`[CRON][${tag}] Done -> total=${res.length} ok=${ok} fail=${fail}`);
    if (fail) {
      // nur kurze Fehlerübersicht loggen
      res.filter((r) => !r.ok).slice(0, 5).forEach((r) =>
        console.warn(`[CRON][${tag}] FAIL id=${r.id} ${r.name}-${r.realm}: ${r.error}`)
      );
    }
    return { ok: true, ..._lastResult };
  } catch (e) {
    _lastResult = { at: _lastRun, error: String(e?.message || e) };
    console.error(`[CRON][${tag}] ERROR: ${_lastResult.error}`);
    return { ok: false, error: _lastResult.error };
  } finally {
    _busy = false;
  }
}

function start(intervalMs = DEFAULT_INTERVAL) {
  stop();
  _intervalMs = Number(intervalMs) || DEFAULT_INTERVAL;
  _timer = setInterval(() => runOnce({}), _intervalMs);
  _timer.unref?.();
  console.log(`[CRON] Intervall gesetzt auf ${_intervalMs} ms`);
  return { ok: true, intervalMs: _intervalMs };
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log("[CRON] Intervall gestoppt");
  }
  return { ok: true };
}

function status() {
  return {
    running: !!_timer,
    intervalMs: _intervalMs,
    lastRunAt: _lastRun,
    lastResult: _lastResult,
    busy: _busy,
  };
}

module.exports = { runOnce, start, stop, status };
