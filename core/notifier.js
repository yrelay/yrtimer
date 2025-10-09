// ESM port — core/notifier.js (GNOME Shell 45+)
// Visual notifications via Main.notify only, with CLI sound fallback.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Gio from 'gi://Gio';

export class Notifier {
  constructor(baseDirPath = null) {
    this._baseDirPath = baseDirPath;
    // Optional GSound support can be added later with dynamic import if desired.
    this._gsCtx = null;
    // Probe CLI fallback backends
    this._cliBackend = this._probeCliBackend();
    if (this._cliBackend) {
      console.debug(`[yrtimer] Notifier: CLI backend=${this._cliBackend.name}`);
    }
  }

  notify(title, message, opts = {}) {
    const { enableNotification = true, enableSound = true, volume = 80, soundFile = 'bell.oga' } = opts;
    if (enableNotification) {
      Main.notify(title, message);
    }
    if (enableSound)
      this._playSound(soundFile, volume);
  }

  _effectiveSoundPath(preferred) {
    if (preferred) preferred = String(preferred).trim();

    if (preferred && preferred.startsWith('/')) {
      const f = Gio.File.new_for_path(preferred);
      if (f.query_exists(null)) return preferred;
    }

    if (preferred && this._baseDirPath) {
      const p = `${this._baseDirPath}/sounds/${preferred}`;
      const f = Gio.File.new_for_path(p);
      if (f.query_exists(null)) return p;
    }

    const sysCandidates = [preferred, 'bell.oga', 'dialog-information.oga'].filter(Boolean);
    for (let i = 0; i < sysCandidates.length; i++) {
      const p = `/usr/share/sounds/freedesktop/stereo/${sysCandidates[i]}`;
      const f = Gio.File.new_for_path(p);
      if (f.query_exists(null)) return p;
    }
    return null;
  }

  _playSound(soundFile, volume) {
    const path = this._effectiveSoundPath(soundFile);
    // (Optional) GSound support can be implemented later
    this._playWithSubprocess(path, volume);
  }

  _probeCliBackend() {
    const backends = [
      { name: 'canberra-gtk-play', args: (p, v) => (p ? ['-f', p] : ['-i', 'bell']) },
      { name: 'paplay',            args: (p, v) => (p ? [p] : []) },
      { name: 'gst-play-1.0',      args: (p, v) => (p ? ['--quiet', p] : []) },
    ];
    for (let i = 0; i < backends.length; i++) {
      const f = Gio.File.new_for_path(`/usr/bin/${backends[i].name}`);
      if (f.query_exists(null)) return backends[i];
      const f2 = Gio.File.new_for_path(`/usr/local/bin/${backends[i].name}`);
      if (f2.query_exists(null)) return backends[i];
    }
    return null;
  }

  _playWithSubprocess(resolvedPath, volume) {
    if (!this._cliBackend) {
      console.warn('[yrtimer] No CLI sound backend available');
      return;
    }
    const argv = [this._cliBackend.name].concat(this._cliBackend.args(resolvedPath, volume));
    Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
  }
}
