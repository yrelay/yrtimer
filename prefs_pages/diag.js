// ESM port — prefs_pages/diag.js (GNOME Shell 45+, Adw/Gtk4)
// Diagnostics page: basic debug toggle, locale override, environment info

import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk?version=4.0';
import GLib from 'gi://GLib';
import Gettext from 'gettext';

export function buildDiagnosticsPage(settings, window) {
  function _getRootPathFromMeta() {
    try {
      const file = Gio.File.new_for_uri(import.meta.url); // prefs_pages/diag.js
      const dir = file.get_parent(); // prefs_pages/
      const root = dir.get_parent(); // extension root
      return root.get_path();
    } catch (_) { return ''; }
  }
  const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer' } };
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

  const page = new Adw.PreferencesPage({ title: _('Diagnostics'), icon_name: 'dialog-information-symbolic' });

  // Group: Debug & Locale
  const grpDiag = new Adw.PreferencesGroup({ title: _('Diagnostics') });

  // Debug toggle
  const rowDebug = new Adw.ActionRow({ title: _('Enable debug logs') });
  const swDebug = new Gtk.Switch({ valign: Gtk.Align.CENTER });
  try { swDebug.active = settings.get_boolean('debug'); } catch (_) { swDebug.active = false; }
  swDebug.connect('notify::active', w => settings.set_boolean('debug', w.active));
  rowDebug.add_suffix(swDebug);
  rowDebug.activatable_widget = swDebug;
  grpDiag.add(rowDebug);

  // Locale override (simple dropdown of compiled locales under locale/)
  const rowLocale = new Adw.ActionRow({ title: _('Override locale for preferences'), subtitle: _('Empty = system default (close/reopen to fully apply)') });
  const labels = [_('System default')];
  try {
    const locDir = Gio.File.new_for_path(`${Me.path}/locale`);
    const en = locDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    let info;
    while ((info = en.next_file(null)) !== null) {
      const name = info.get_name();
      if (name && !name.startsWith('.') && info.get_file_type() === Gio.FileType.DIRECTORY)
        labels.push(name);
    }
  } catch (_) {}
  const ddLocales = Gtk.DropDown.new_from_strings(labels);
  try {
    const cur = settings.get_string('override-locale') || '';
    ddLocales.set_selected(cur ? labels.indexOf(cur) : 0);
  } catch (_) {}
  ddLocales.connect('notify::selected', d => {
    const sel = d.get_selected();
    const val = labels[sel] || '';
    settings.set_string('override-locale', sel <= 0 ? '' : val);
    try {
      const dlg = new Adw.MessageDialog({ transient_for: window, modal: true, heading: _('Language changed'), body: _('Close and reopen preferences to apply translations.') });
      dlg.add_response('ok', _('OK'));
      dlg.set_default_response('ok');
      dlg.set_close_response('ok');
      dlg.present();
    } catch (_) {}
  });
  rowLocale.add_suffix(ddLocales);
  grpDiag.add(rowLocale);

  // Group: Status
  const grpStatus = new Adw.PreferencesGroup({ title: _('Status') });
  const rowStatus = new Adw.ActionRow({ subtitle: _('Status and environment checks (Press Refresh to update)') });
  const sw = new Gtk.ScrolledWindow({ hexpand: true, vexpand: false, min_content_height: 140 });
  const tv = new Gtk.TextView({ editable: false, monospace: true, wrap_mode: Gtk.WrapMode.WORD_CHAR });
  const buf = tv.get_buffer();

  const buildStatus = () => {
    const lines = [];
    try { lines.push(`${_('Extension path')}: ${Me.path}`); } catch (_) {}
    try {
      const [ok, outBytes] = GLib.spawn_command_line_sync('gnome-shell --version');
      if (ok && outBytes) {
        let ver = '';
        try { ver = new TextDecoder().decode(outBytes); } catch (_) { ver = String(outBytes); }
        lines.push(`${_('GNOME Shell')}: ${ver.trim()}`);
      }
    } catch (e) { lines.push(`Shell version check error: ${e}`); }
    try {
      const [ok2, outBytes2] = GLib.spawn_command_line_sync('gnome-extensions info yrtimer@yrelay.fr');
      if (ok2 && outBytes2) {
        let info = '';
        try { info = new TextDecoder().decode(outBytes2); } catch (_) { info = String(outBytes2); }
        const stateLine = info.split('\n').find(l => l.toLowerCase().includes('état:') || l.toLowerCase().includes('state:'));
        if (stateLine)
          lines.push(`${_('Extension state')}: ${stateLine.split(':').slice(1).join(':').trim()}`);
        else
          lines.push(`${_('Extension info')}: ${info.trim().split('\n')[0]}`);
      }
    } catch (e) { lines.push(`Extensions info error: ${e}`); }
    try {
      const iconPath = `${Me.path}/icons/yrtimer-symbolic.svg`;
      const f = Gio.File.new_for_path(iconPath);
      lines.push(`${_('Icon (embedded)')}: ${iconPath} -> ${f.query_exists(null) ? _('exists') : _('missing')}`);
    } catch (e) { lines.push(`Icon check error: ${e}`); }
    try { lines.push(`panel-style: ${settings.get_string('panel-style')}`); } catch (e) { lines.push(`panel-style error: ${e}`); }
    try { lines.push(`display-format: ${settings.get_string('display-format')}`); } catch (e) { lines.push(`display-format error: ${e}`); }
    try {
      const arr = settings.get_value('presets').deep_unpack();
      lines.push(`${_('presets (sec)')}: ${JSON.stringify(arr)}`);
    } catch (e) { lines.push(`presets error: ${e}`); }
    try { lines.push(`repeat-enabled: ${settings.get_boolean('repeat-enabled')}`); } catch (_) {}
    try { lines.push(`repeat-count: ${settings.get_int('repeat-count')}`); } catch (_) {}
    try { lines.push(`repeat-interval-seconds: ${settings.get_int('repeat-interval-seconds')}`); } catch (_) {}
    try { lines.push(`enable-notification: ${settings.get_boolean('enable-notification')}`); } catch (_) {}
    try { lines.push(`enable-sound: ${settings.get_boolean('enable-sound')}`); } catch (_) {}
    try { lines.push(`default-sound: ${settings.get_string('default-sound')}`); } catch (_) {}
    try { lines.push(`volume: ${settings.get_int('volume')}`); } catch (_) {}
    try { lines.push(`debug: ${settings.get_boolean('debug')}`); } catch (_) {}
    return lines.join('\n');
  };

  buf.set_text(buildStatus(), -1);
  sw.set_child(tv);
  rowStatus.add_suffix(sw);

  const btnRefresh = new Gtk.Button({ label: _('Refresh') });
  btnRefresh.connect('clicked', () => {
    buf.set_text(buildStatus(), -1);
  });
  rowStatus.add_suffix(btnRefresh);

  const btnCopy = new Gtk.Button({ label: _('Copy') });
  btnCopy.connect('clicked', () => {
    try {
      const display = Gdk.Display.get_default();
      const text = buildStatus();
      if (display) {
        const clipboard = display.get_clipboard();
        try { clipboard.set_text(text); } catch (_) {}
      }
    } catch (_) {}
  });
  rowStatus.add_suffix(btnCopy);

  grpStatus.add(rowStatus);

  page.add(grpDiag);
  page.add(grpStatus);
  return page;
}
