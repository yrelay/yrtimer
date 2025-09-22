// Compatibility shim for ExtensionUtils across GNOME Shell 45–48+
// Provides: getSettings, getCurrentExtension, initTranslations, openPrefs (synchrones)

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gettext from 'gettext';

let LegacyUtils = null;
try {
  // Disponible sur la plupart des versions (legacy et ESM)
  // eslint-disable-next-line no-undef
  LegacyUtils = imports.misc ? imports.misc.extensionUtils : null;
} catch (_) {
  LegacyUtils = null;
}

function getBasePathFromMeta() {
  try {
    const file = Gio.File.new_for_uri(import.meta.url);
    const dir = file.get_parent();
    const root = dir.get_parent();
    return root ? root.get_path() : '';
  } catch (_) { return ''; }
}

export function getSettings() {
  if (LegacyUtils && typeof LegacyUtils.getSettings === 'function') {
    try { return LegacyUtils.getSettings(); } catch (_) {}
  }
  // Fallback direct
  return new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.yrtimer' });
}

export function getCurrentExtension() {
  if (LegacyUtils && typeof LegacyUtils.getCurrentExtension === 'function') {
    try { return LegacyUtils.getCurrentExtension(); } catch (_) {}
  }
  const base = getBasePathFromMeta();
  return { path: base, metadata: { 'gettext-domain': 'yrtimer', url: 'https://github.com/yrelay/yrtimer', uuid: 'yrtimer@yrelay.fr' } };
}

export function initTranslations(domain) {
  if (LegacyUtils && typeof LegacyUtils.initTranslations === 'function') {
    try { LegacyUtils.initTranslations(domain); return; } catch (_) {}
  }
  // Fallback: bind direct
  try {
    const base = getBasePathFromMeta();
    const d = domain || 'yrtimer';
    const localePath = `${base}/locale`;
    if (Gettext.bindtextdomain) Gettext.bindtextdomain(d, localePath);
    if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(d, 'UTF-8');
  } catch (_) {}
}

export function openPrefs() {
  if (LegacyUtils && typeof LegacyUtils.openPrefs === 'function') {
    try { return LegacyUtils.openPrefs(); } catch (_) {}
  }
  try {
    const proc = Gio.Subprocess.new(['gnome-extensions', 'prefs', 'yrtimer@yrelay.fr'], Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE);
    proc.init(null);
  } catch (_) {}
}
