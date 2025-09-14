// core/timer.js (legacy imports for GNOME 43)
// Timer with IDLE/RUNNING/PAUSED states and 1 Hz tick

const GLib = imports.gi.GLib;

var TimerState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
};

var Timer = class Timer {
  constructor(logDebug = null) {
    this._state = TimerState.IDLE;
    this._remaining = 0; // seconds
    this._tickSourceId = 0;
    this._onChanged = [];
    this._onElapsed = null;
    this._logDebug = typeof logDebug === 'function' ? logDebug : () => {};
  }

  onChanged(cb) {
    if (typeof cb === 'function') this._onChanged.push(cb);
  }
  onElapsed(cb) { this._onElapsed = cb; }

  get state() { return this._state; }
  get remaining() { return this._remaining; }

  start(totalSec = null) {
    if (typeof totalSec === 'number')
      this._remaining = Math.max(0, Math.floor(totalSec));

    if (this._remaining <= 0) {
      this._logDebug('Timer.start ignored: remaining <= 0');
      return;
    }

    this._ensureNoTick();
    this._state = TimerState.RUNNING;
    this._emitChanged();

    this._tickSourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      1,
      () => {
        this._remaining = Math.max(0, this._remaining - 1);
        this._emitChanged();
        if (this._remaining === 0) {
          this._ensureNoTick();
          this._state = TimerState.IDLE;
          this._emitChanged();
          if (this._onElapsed) this._onElapsed();
          return GLib.SOURCE_REMOVE;
        }
        return GLib.SOURCE_CONTINUE;
      }
    );
  }

  pause() {
    if (this._state !== TimerState.RUNNING)
      return;
    this._ensureNoTick();
    this._state = TimerState.PAUSED;
    this._emitChanged();
  }

  reset() {
    this._ensureNoTick();
    this._remaining = 0;
    this._state = TimerState.IDLE;
    this._emitChanged();
  }

  // Set remaining seconds and switch to PAUSED without starting a tick
  setPaused(remainingSec) {
    this._ensureNoTick();
    this._remaining = Math.max(0, Math.floor(remainingSec || 0));
    this._state = this._remaining > 0 ? TimerState.PAUSED : TimerState.IDLE;
    this._emitChanged();
  }

  // Format remaining time based on seconds, using mm:ss if < 1h else hh:mm:ss
  formatRemaining() {
    const t = Math.max(0, Math.floor(this._remaining));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Simple parser for durations: number (seconds), hh:mm(:ss), or free units like 2h 3m 4s
  static parseDuration(input) {
    if (!input || typeof input !== 'string') return 0;
    const str = input.trim();
    if (!str) return 0;

    // hh:mm or hh:mm:ss
    const hhmm = str.match(/^\s*(\d+):(\d{1,2})(?::(\d{1,2}))?\s*$/);
    if (hhmm) {
      const h = parseInt(hhmm[1], 10);
      const m = parseInt(hhmm[2], 10);
      const s = hhmm[3] ? parseInt(hhmm[3], 10) : 0;
      if (m >= 60 || s >= 60) return 0;
      return h * 3600 + m * 60 + s;
    }

    // number only → seconds
    if (/^\d+$/.test(str)) return parseInt(str, 10);

    // free units like "2h 3m 4s" in any order
    let total = 0;
    const re = /(\d+)\s*([hH]|hours?)|(\d+)\s*([mM]|minutes?)|(\d+)\s*([sS]|seconds?)/g;
    let match;
    while ((match = re.exec(str)) !== null) {
      if (match[1]) total += parseInt(match[1], 10) * 3600;
      else if (match[3]) total += parseInt(match[3], 10) * 60;
      else if (match[5]) total += parseInt(match[5], 10);
    }
    return total;
  }

  _ensureNoTick() {
    if (this._tickSourceId) {
      GLib.source_remove(this._tickSourceId);
      this._tickSourceId = 0;
    }
  }

  _emitChanged() {
    try {
      for (let i = 0; i < this._onChanged.length; i++) {
        try { this._onChanged[i](); } catch (_) {}
      }
    } catch (_) {}
  }
}
