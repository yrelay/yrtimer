// prefs/diag.js - Diagnostics page extracted from prefs.js (GNOME 43 compatible)

const { Adw, Gtk, Gio, Gdk, GLib } = imports.gi;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;

function buildDiagnosticsPage(settings, window) {
  const Me = ExtensionUtils.getCurrentExtension();
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

  const pageDiag = new Adw.PreferencesPage({ title: _('Diagnostics'), icon_name: 'dialog-information-symbolic' });

  // Note: pas de redémarrage automatique de l’extension depuis les préférences
  const grpDiag = new Adw.PreferencesGroup({ title: _('Diagnostics') });
  // Debug toggle
  const rowDebug = new Adw.ActionRow({ title: _('Enable debug logs') });
  const swDebug = new Gtk.Switch({ valign: Gtk.Align.CENTER });
  try { swDebug.active = settings.get_boolean('debug'); } catch (_) { swDebug.active = false; }
  swDebug.connect('notify::active', w => settings.set_boolean('debug', w.active));
  rowDebug.add_suffix(swDebug);
  rowDebug.activatable_widget = swDebug;
  grpDiag.add(rowDebug);

  // Locale override for debugging
  const rowLocale = new Adw.ActionRow({ title: _('Override locale for preferences'), subtitle: _('Empty = system default (restart prefs to fully apply)') });
  const ddLocales = Gtk.DropDown.new_from_strings([_('System default')]);
  let _relaunchScheduled = false;
  try {
    // Populate from available compiled locales under extension's locale dir
    const locales = [];
    try {
      const Me2 = ExtensionUtils.getCurrentExtension();
      const locDir = Gio.File.new_for_path(`${Me2.path}/locale`);
      const en = locDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
      let info;
      while ((info = en.next_file(null)) !== null) {
        const name = info.get_name();
        if (name && !name.startsWith('.') && info.get_file_type() === Gio.FileType.DIRECTORY)
          locales.push(name);
      }
    } catch (_) {}
    locales.sort();
    const labels = [_('System default'), ...locales];
    const dd2 = Gtk.DropDown.new_from_strings(labels);
    // Replace initial widget with populated one
    rowLocale.add_suffix(dd2);
    // Preselect current value
    try {
      const cur = settings.get_string('override-locale') || '';
      dd2.set_selected(cur ? labels.indexOf(cur) : 0);
    } catch (_) {}
    dd2.connect('notify::selected', d => {
      const sel = d.get_selected();
      const val = labels[sel] || '';
      settings.set_string('override-locale', sel <= 0 ? '' : val);
      try {
        const dlg = new Adw.MessageDialog({ transient_for: window, modal: true, heading: _('Language changed'), body: _('Restarting preferences to apply translations...') });
        dlg.add_response('ok', _('OK'));
        dlg.set_default_response('ok');
        dlg.set_close_response('ok');
        dlg.present();
      } catch (_) {}
      // Auto-relaunch preferences so gettext rebinding takes effect across all pages
      try {
        if (_relaunchScheduled) return;
        _relaunchScheduled = true;
        // Pas de redémarrage automatique de l’extension ici (évite blocages)
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
          try { window.close(); } catch (_) {}
          // Use CLI relaunch to avoid GApplication singleton collision
          try { GLib.spawn_command_line_async('gnome-extensions prefs yrtimer@yrelay.fr'); } catch (_) {}
          _relaunchScheduled = false;
          return GLib.SOURCE_REMOVE;
        });
      } catch (_) {}
    });
  } catch (_) {
    // Fallback simple entry
    const entry = new Gtk.Entry({ hexpand: true });
    entry.set_placeholder_text(_('e.g., fr, de, zh_CN'));
    try { entry.set_text(settings.get_string('override-locale') || ''); } catch (_) {}
    entry.connect('changed', e => {
      settings.set_string('override-locale', e.get_text());
      try {
        const dlg = new Adw.MessageDialog({ transient_for: window, modal: true, heading: _('Language changed'), body: _('Restarting preferences to apply translations...') });
        dlg.add_response('ok', _('OK'));
        dlg.set_default_response('ok');
        dlg.set_close_response('ok');
        dlg.present();
      } catch (_) {}
      try {
        if (_relaunchScheduled) return;
        _relaunchScheduled = true;
        // Redémarrer l'extension (D-Bus avec fallback CLI)
        restartExtension('yrtimer@yrelay.fr');
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
          try { window.close(); } catch (_) {}
          try { GLib.spawn_command_line_async('gnome-extensions prefs yrtimer@yrelay.fr'); } catch (_) {}
          _relaunchScheduled = false;
          return GLib.SOURCE_REMOVE;
        });
      } catch (_) {}
    });
    rowLocale.add_suffix(entry);
  }
  grpDiag.add(rowLocale);

  function buildDiagnosticsText() {
    const Me = ExtensionUtils.getCurrentExtension();
    const base = Me.path;
    let lines = [];
    lines.push(`${_('Extension path')}: ${base}`);
    try {
      const iconPath = `${base}/icons/yrtimer-symbolic.svg`;
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
  }

  const rowDiag = new Adw.ActionRow({ subtitle: _('Status and environment checks (Press Refresh to update)') });
  const sw = new Gtk.ScrolledWindow({ hexpand: true, vexpand: false, min_content_height: 140 });
  const tv = new Gtk.TextView({ editable: false, monospace: true, wrap_mode: Gtk.WrapMode.WORD_CHAR });
  // Better readability for RTL languages (e.g., Arabic, Hebrew, Persian, Urdu)
  try {
    const rtlLangs = ['ar', 'he', 'fa', 'ur'];
    let loc = '';
    try { loc = settings.get_string('override-locale') || ''; } catch (_) {}
    if (!loc) {
      try { loc = GLib.getenv('LANGUAGE') || GLib.getenv('LC_MESSAGES') || ''; } catch (_) {}
    }
    if (loc) {
      const tag = loc.split(':')[0];
      const base = tag.split('.')[0];
      const prefix = base.split('_')[0];
      if (rtlLangs.includes(prefix)) {
        try { tv.set_direction(Gtk.TextDirection.RTL); } catch (_) {}
      }
    }
  } catch (_) {}
  const buf = tv.get_buffer();
  buf.set_text(buildDiagnosticsText(), -1);
  sw.set_child(tv);
  rowDiag.add_suffix(sw);

  const btnRefresh = new Gtk.Button({ label: _('Refresh') });
  btnRefresh.connect('clicked', () => {
    const Me = ExtensionUtils.getCurrentExtension();
    const base = Me.path;
    let lines = [];
    lines.push(`${_('Extension path')}: ${base}`);
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
      const iconPath = `${base}/icons/yrtimer-symbolic.svg`;
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
    buf.set_text(lines.join('\n'), -1);
  });
  rowDiag.add_suffix(btnRefresh);

  const btnCopy = new Gtk.Button({ label: _('Copy') });
  btnCopy.connect('clicked', () => {
    try {
      const display = Gdk.Display.get_default();
      const text = buildDiagnosticsText();
      if (display) {
        const clipboard = display.get_clipboard();
        try { clipboard.set_text(text); } catch (_) {}
      }
      try { GLib.spawn_command_line_async(`bash -lc "printf '%s' \"${text.replace(/"/g, '\\"')}\" | xclip -selection clipboard"`); } catch (_) {}
      try {
        const dlg = new Adw.MessageDialog({ transient_for: window, modal: true, heading: _('Diagnostics copied'), body: _('Diagnostics have been copied to the clipboard.') });
        dlg.add_response('ok', _('OK'));
        dlg.set_default_response('ok');
        dlg.set_close_response('ok');
        dlg.present();
      } catch (_) {}
    } catch (_) {}
  });
  rowDiag.add_suffix(btnCopy);
  grpDiag.add(rowDiag);
  pageDiag.add(grpDiag);
  return pageDiag;
}

var buildDiagnosticsPage = buildDiagnosticsPage;
