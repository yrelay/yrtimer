// ESM port — extension.js (GNOME Shell 45+)
// This file mirrors the legacy extension.js but uses ESM imports/exports.
// It is located under work/migration/v2/src-esm/ during the migration phase.
// Once validated, it will replace the root-level extension.js.

// GI modules
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// GNOME Shell modules
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ExtensionUtils from './core/extensionUtilsCompat.js';


// Internal modules
import { getSettings } from './core/settings.js';
import { Indicator as IndicatorClass } from './ui/indicator.js';

let _ = (s) => s;

export default class Extension {
  constructor(uuid) {
    try {
      const Me = ExtensionUtils.getCurrentExtension();
      const domain = (Me && Me.metadata && Me.metadata['gettext-domain']) || 'yrtimer';
      try { ExtensionUtils.initTranslations(domain); } catch (_) {}
      _ = ExtensionUtils.gettext;
    } catch (_) {}
    this._indicator = null;
    this._settings = null;
  }

  enable() {
    const Me = ExtensionUtils.getCurrentExtension();
    const baseDir = Me.path;

    try { console.log('[yrtimer] enable() entered'); } catch (_) {}

    const IndicatorCtor = IndicatorClass;
    try { this._settings = getSettings ? getSettings() : null; } catch (e) {
      this._settings = null;
      try { console.error('[yrtimer] getSettings failed:', e); Main.notify('yrtimer', `${_('getSettings failed')}: ${e}`); } catch (_) {}
    }

    try {
      if (this._settings) {
        const style = this._settings.get_string('panel-style');
        if (!style || style === '') this._settings.set_string('panel-style', 'both');
      }
    } catch (_) {}

    try {
      this._indicator = IndicatorCtor ? new IndicatorCtor() : null;
      if (this._indicator) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          try { this._indicator.addToPanel(); } catch (ee) { try { console.error('[yrtimer] indicator add failed (idle):', ee); } catch (_) {} }
          return GLib.SOURCE_REMOVE;
        });
      }
    } catch (e) {
      try { console.error('[yrtimer] indicator add failed:', e); Main.notify('yrtimer', `${_('Indicator add failed')}: ${e}`); } catch (_) {}
    }

    try {
      if (this._settings && this._indicator) {
        const raw = this._settings.get_string('last-state');
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj && obj.state === 'RUNNING' && typeof obj.remaining === 'number') {
            this._indicator.restorePaused(obj.remaining);
          }
        }
        const t = this._indicator.getTimer();
        const persist = () => {
          const state = t.state;
          const remaining = t.remaining;
          const payload = JSON.stringify({ state, remaining, savedAt: Date.now() });
          this._settings.set_string('last-state', payload);
        };
        t.onChanged(persist);
        console.log('[yrtimer] State restore wired');
      }
    } catch (e) {
      console.error('[yrtimer] restore/persist failed:', e);
    }
  }

  disable() {
    try {
      if (this._settings && this._indicator) {
        const t = this._indicator.getTimer();
        const payload = JSON.stringify({ state: t.state, remaining: t.remaining, savedAt: Date.now() });
        this._settings.set_string('last-state', payload);
      }
    } catch (_) {}
    try {
      if (this._indicator) {
        this._indicator.destroy();
        this._indicator = null;
      }
    } catch (_) {}
  }
}
