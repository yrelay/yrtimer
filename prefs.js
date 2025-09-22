// ESM port — prefs.js (GNOME Shell 45+, Adw/Gtk4)
// Builds the preferences window using page builders from prefs_pages/*

import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk?version=4.0';
import GLib from 'gi://GLib';
import Gettext from 'gettext';
import { getSettings } from './core/settings.js';

import { buildGeneralPage } from './prefs_pages/general.js';
import { buildPanelPage } from './prefs_pages/panel.js';
import { buildPresetsPage } from './prefs_pages/presets.js';
import { buildRepeatPage } from './prefs_pages/repeat.js';
import { buildDiagnosticsPage } from './prefs_pages/diag.js';

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
    try {
      const localePath = `${Me.path}/locale`;
      if (Gettext.bindtextdomain) Gettext.bindtextdomain(domain, localePath);
      if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(domain, 'UTF-8');
      if (Gettext.textdomain) Gettext.textdomain(domain);
    } catch (_) {}
    try { _ = Gettext.domain(domain).gettext; } catch (_) {}
  } catch (_) {}
}

export function fillPreferencesWindow(window) {
  const settings = getSettings();

  try {
    const domain = Me.metadata['gettext-domain'] || 'yrtimer';
    const loc = settings.get_string('override-locale') || '';
    if (loc) {
      try { GLib.setenv('LANGUAGE', loc, true); } catch (_) {}
      try { GLib.setenv('LC_MESSAGES', loc, true); } catch (_) {}
    }
    try {
      const localePath = `${Me.path}/locale`;
      if (Gettext.bindtextdomain) Gettext.bindtextdomain(domain, localePath);
      if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(domain, 'UTF-8');
      if (Gettext.textdomain) Gettext.textdomain(domain);
    } catch (_) {}
    try { _ = Gettext.domain(domain).gettext; } catch (_) {}
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

  // Optionally diagnostics
  try {
    const showDiag = settings.get_boolean('show-diagnostics');
    const dbg = settings.get_boolean('debug');
    if (buildDiagnosticsPage && (showDiag || dbg)) {
      const pageDiag = buildSafe(() => buildDiagnosticsPage(settings, window));
      if (pageDiag) window.add(pageDiag);
    }
  } catch (_) {}

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
