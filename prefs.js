// ESM port — prefs.js (GNOME Shell 45+, Adw/Gtk4)
// Builds the preferences window using page builders from prefs_pages/*

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import * as ExtensionUtils from './core/extensionUtilsCompat.js';
import { getSettings } from './core/settings.js';

import { buildGeneralPage } from './prefs_pages/general.js';
import { buildPanelPage } from './prefs_pages/panel.js';
import { buildPresetsPage } from './prefs_pages/presets.js';
import { buildRepeatPage } from './prefs_pages/repeat.js';

let _ = (s) => s;
function _getRootPathFromMeta() {
  try {
    const file = Gio.File.new_for_uri(import.meta.url); // prefs.js
    const dir = file.get_parent();
    return dir ? dir.get_path() : '';
  } catch (_) { return ''; }
}
const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer', url: 'https://github.com/yrelay/yrtimer' } };

export function init() {
  try {
    const domain = Me.metadata['gettext-domain'] || 'yrtimer';
    try { ExtensionUtils.initTranslations(domain); } catch (_) {}
    _ = ExtensionUtils.gettext;
  } catch (_) {}
}

export function fillPreferencesWindow(window) {
  const settings = getSettings();
  try {
    const domain = Me.metadata['gettext-domain'] || 'yrtimer';
    try { ExtensionUtils.initTranslations(domain); } catch (_) {}
    _ = ExtensionUtils.gettext;
  } catch (_) {}

  // Pages
  const pageGeneral = buildSafe(() => buildGeneralPage(settings));
  if (pageGeneral) window.add(pageGeneral);

  const pagePanel = buildSafe(() => buildPanelPage(settings));
  if (pagePanel) window.add(pagePanel);

  const pagePresets = buildSafe(() => buildPresetsPage(settings));
  if (pagePresets) window.add(pagePresets);

  const pageRepeat = buildSafe(() => buildRepeatPage(settings));
  if (pageRepeat) window.add(pageRepeat);

  // About
  const pageAbout = new Adw.PreferencesPage({ title: _('About'), icon_name: 'help-about-symbolic' });
  const grpAbout = new Adw.PreferencesGroup({ title: _('About') });
  const aboutRow = new Adw.ActionRow({ subtitle: _('For feature requests or bug reports, please visit GitHub. No warranty, express or implied.') });
  const linksBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
  try {
    const repoUrl = (Me.metadata && Me.metadata['url']) || 'https://github.com/yrelay/yrtimer';
    const issuesUrl = (repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl) + '/issues';
    const btnRepo = new Gtk.LinkButton({ label: _('GitHub'), uri: repoUrl });
    const btnIssues = new Gtk.LinkButton({ label: _('Issues'), uri: issuesUrl });
    const btnDonate = new Gtk.LinkButton({ label: _('Donate'), uri: 'https://paypal.me/yrelay' });
    linksBox.append(btnRepo);
    linksBox.append(btnIssues);
    linksBox.append(btnDonate);
  } catch (_) {}
  aboutRow.add_suffix(linksBox);
  grpAbout.add(aboutRow);
  pageAbout.add(grpAbout);
  window.add(pageAbout);

  try { window.present(); } catch (_) {}
}

function buildSafe(fn) {
  try { return fn(); } catch (e) { try { console.warn('[yrtimer] prefs build error:', e); } catch (_) {} return null; }
}

// Some loaders (e.g., GNOME Extensions website integration) may expect the
// preferences module to export a default class. Provide a thin wrapper class
// that delegates to our function-based implementation.
export default class Preferences {
  constructor() {}
  fillPreferencesWindow(window) {
    try { return fillPreferencesWindow(window); } catch (_) {}
  }
}
