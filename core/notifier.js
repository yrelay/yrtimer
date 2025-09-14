// core/notifier.js - legacy GJS for GNOME 43
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Gio = imports.gi.Gio;
let GSound = null;
try { GSound = imports.gi.GSound; } catch (_) { GSound = null; }

var Notifier = class Notifier {
  constructor(baseDirPath = null) {
    this._baseDirPath = baseDirPath;
    this._gsCtx = null;
    this._traySource = null;
    if (GSound && GSound.Context) {
      try {
        this._gsCtx = new GSound.Context();
        this._gsCtx.init();
        try { log('[yrtimer] Notifier: using GSound backend'); } catch (_) {}
      } catch (_) { this._gsCtx = null; }
    }
    // Probe available CLI players as fallbacks
    this._cliBackend = this._probeCliBackend();
    if (this._cliBackend) try { log(`[yrtimer] Notifier: CLI backend=${this._cliBackend}`); } catch (_) {}
  }

  notify(title, message, opts = {}) {
    const { enableNotification = true, enableSound = true, volume = 80, soundFile = 'bell.oga' } = opts;
    if (enableNotification) {
      try {
        // Prefer MessageTray for reliability and urgency control on GS 43
        if (!this._traySource) {
          this._traySource = new MessageTray.Source('YRTimer', 'alarm-symbolic');
          try { this._traySource.connect('destroy', () => { this._traySource = null; }); } catch (_) {}
          Main.messageTray.add(this._traySource);
        }
        const n = new MessageTray.Notification(this._traySource, title, message);
        // Make sure repeated notifications banner properly
        try { n.setUrgency(MessageTray.Urgency.CRITICAL); } catch (_) {}
        try { n.setTransient(true); } catch (_) {}
        try { n.setResident(false); } catch (_) {}
        try { n.setForFeedback(true); } catch (_) {}
        this._traySource.showNotification(n);
        try { log('[yrtimer] Notification shown via MessageTray'); } catch (_) {}
      } catch (e) {
        try { log(`[yrtimer] messageTray notify failed: ${e}`); } catch (_) {}
        try { Main.notify(title, message); } catch (_) {}
      }
    }
    if (enableSound)
      this._playSound(soundFile, volume);
  }

  _effectiveSoundPath(preferred) {
    // Normalize
    try { if (preferred) preferred = String(preferred).trim(); } catch (_) {}

    // 0) Absolute path provided by user
    if (preferred && preferred.startsWith('/')) {
      try {
        const f = Gio.File.new_for_path(preferred);
        if (f.query_exists(null)) return preferred;
      } catch (_) {}
    }

    // 1) Extension-bundled sounds/<file>
    if (preferred && this._baseDirPath) {
      try {
        const p = `${this._baseDirPath}/sounds/${preferred}`;
        const f = Gio.File.new_for_path(p);
        if (f.query_exists(null)) return p;
      } catch (_) {}
    }
    // 2) System sound theme (freedesktop)
    const sysCandidates = [
      preferred,
      'bell.oga',
      'dialog-information.oga',
    ].filter(Boolean);
    for (let i = 0; i < sysCandidates.length; i++) {
      try {
        const p = `/usr/share/sounds/freedesktop/stereo/${sysCandidates[i]}`;
        const f = Gio.File.new_for_path(p);
        if (f.query_exists(null)) return p;
      } catch (_) {}
    }
    return null;
  }

  _playSound(soundFile, volume) {
    const path = this._effectiveSoundPath(soundFile);
    // 1) GSound backend
    if (this._gsCtx) {
      try {
        const params = {};
        if (path) params['media.filename'] = path;
        params['event.id'] = 'bell';
        const v = Math.max(0, Math.min(100, Number.isFinite(volume) ? volume : 80));
        params['canberra.volume'] = v / 100.0;
        this._gsCtx.play_simple(params);
        return;
      } catch (e) {
        try { log(`[yrtimer] GSound play failed: ${e}`); } catch (_) {}
      }
    }
    // 2) CLI fallback
    this._playWithSubprocess(path);
  }

  _probeCliBackend() {
    // Prefer canberra-gtk-play, else paplay, else gst-play-1.0
    const backends = [
      { name: 'canberra-gtk-play', args: (p) => (p ? ['-f', p] : ['-i', 'bell']) },
      { name: 'paplay',            args: (p) => (p ? [p] : []) },
      { name: 'gst-play-1.0',      args: (p) => (p ? ['--quiet', p] : []) },
    ];
    for (let i = 0; i < backends.length; i++) {
      try {
        const f = Gio.File.new_for_path(`/usr/bin/${backends[i].name}`);
        if (f.query_exists(null)) return backends[i];
      } catch (_) {}
      try {
        const f2 = Gio.File.new_for_path(`/usr/local/bin/${backends[i].name}`);
        if (f2.query_exists(null)) return backends[i];
      } catch (_) {}
    }
    return null;
  }

  _playWithSubprocess(resolvedPath) {
    if (!this._cliBackend) {
      try { log('[yrtimer] No CLI sound backend available'); } catch (_) {}
      return;
    }
    try {
      const argv = [this._cliBackend.name].concat(this._cliBackend.args(resolvedPath));
      Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
    } catch (e) {
      try { log(`[yrtimer] sound fallback failed: ${e}`); } catch (_) {}
    }
  }
}

