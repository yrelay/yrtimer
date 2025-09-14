// extension.js - legacy imports for GNOME 43 compatibility

const { Gio, GLib } = imports.gi;
const Gettext = imports.gettext;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

// i18n binding for this module
let _ = (s) => s;

let _indicator = null;
let _settings = null;
function shouldDebug() {
  try { return _settings && _settings.get_boolean && _settings.get_boolean('debug'); } catch (_) { return false; }
}

function init() {
  // Initialization (no UI yet)
  try {
    const Me = ExtensionUtils.getCurrentExtension();
    // Bind gettext domain so runtime UI (indicator/menu) can translate strings
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain'] || 'yrtimer');
    try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}
  } catch (_) {}
}

function enable() {
  const Me = ExtensionUtils.getCurrentExtension();
  const baseDir = Me.path;

  // Ultra-early breadcrumb: log + write a small marker file to confirm enable() is entered
  try {
    log('[yrtimer] enable() entered');
    const GioNS = imports.gi.Gio;
    const f = GioNS.File.new_for_path(`${baseDir}/.last-enable`);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(String(new Date().toISOString()));
    f.replace_contents(bytes, null, false, GioNS.FileCreateFlags.REPLACE_DESTINATION, null);
  } catch (_) {}

  const Settings = Me.imports.core.settings;
  const IndicatorClass = Me.imports.ui.indicator.Indicator;

  try { _settings = Settings.getSettings(); } catch (e) { _settings = null; try { log(`[yrtimer] getSettings failed: ${e}`); Main.notify('yrtimer', `${_('getSettings failed')}: ${e}`); } catch (_) {} }

  // Ensure a sane default for panel-style at first run
  try {
    if (_settings) {
      const style = _settings.get_string('panel-style');
      if (!style || style === '') _settings.set_string('panel-style', 'both');
    }
  } catch (_) {}

  try {
    _indicator = new IndicatorClass();
    // Defer add to panel to next main loop cycle to avoid race conditions
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      try {
        _indicator.addToPanel();
      } catch (ee) {
        try { log(`[yrtimer] indicator add failed (idle): ${ee}`); } catch (_) {}
      }
      return GLib.SOURCE_REMOVE;
    });
  } catch (e) {
    try { log(`[yrtimer] indicator add failed: ${e}`); Main.notify('yrtimer', `${_('Indicator add failed')}: ${e}`); } catch (_) {}
  }

  // Restore last state: if previously RUNNING, resume as PAUSED
  try {
    if (_settings) {
      const raw = _settings.get_string('last-state');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.state === 'RUNNING' && typeof obj.remaining === 'number') {
          _indicator.restorePaused(obj.remaining);
        }
      }
      const t = _indicator.getTimer();
      const persist = () => {
        const state = t.state;
        const remaining = t.remaining;
        const payload = JSON.stringify({ state, remaining, savedAt: Date.now() });
        _settings.set_string('last-state', payload);
      };
      t.onChanged(persist);
      try { if (shouldDebug()) Main.notify('yrtimer', _(`State restore wired`)); else log('[yrtimer] State restore wired'); } catch (_) {}
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    log(`[yrtimer] restore/persist failed: ${e}`);
    try { if (shouldDebug()) Main.notify('yrtimer', `${_('restore/persist failed')}: ${e}`); } catch (_) {}
  }
}

function disable() {
  try {
    if (_settings && _indicator) {
      const t = _indicator.getTimer();
      const payload = JSON.stringify({ state: t.state, remaining: t.remaining, savedAt: Date.now() });
      _settings.set_string('last-state', payload);
    }
  } catch (_) {}
  try {
    if (_indicator) {
      _indicator.destroy();
      _indicator = null;
    }
  } catch (_) {}
}

// Ensure legacy GJS exports are visible (single definition)
var init = init;
var enable = enable;
var disable = disable;
