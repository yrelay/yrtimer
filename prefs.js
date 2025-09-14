// prefs.js - GNOME Extensions Preferences (compatible GNOME 43)
// Use legacy GJS import style for compatibility

const { Adw, Gtk, Gio, GObject, Gdk, GLib } = imports.gi;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
// Prefer using the extension's Notifier for professional parity with runtime
let Notifier = null;
try { Notifier = Me.imports.core.notifier.Notifier; } catch (_) {}
// Extracted: diagnostics page builder
let buildDiagnosticsPage = null;
try { buildDiagnosticsPage = Me.imports.prefs_pages.diag.buildDiagnosticsPage; } catch (_) {}
// Extracted: other page builders (lazy-loaded after locale rebind in fillPreferencesWindow)

// Gettext binding for this domain
let _ = (s) => s;
try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

function init() {
  // Initialization for prefs if needed (e.g., translations)
  try { ExtensionUtils.initTranslations(Me.metadata['gettext-domain'] || 'yrtimer'); } catch (_) {}
}

function fillPreferencesWindow(window) {
  // window is an Adw.PreferencesWindow
  const settings = ExtensionUtils.getSettings();

  // Apply locale override for this prefs session (prefs runs in its own process).
  // We can safely set LANGUAGE/LC_MESSAGES for the lifetime of this prefs process.
  try {
    const loc = settings.get_string('override-locale') || '';
    const domain = Me.metadata['gettext-domain'] || 'yrtimer';
    if (loc) {
      try { GLib.setenv('LANGUAGE', loc, true); } catch (_) {}
      try { GLib.setenv('LC_MESSAGES', loc, true); } catch (_) {}
    }
    // Rebind translations to the extension's locale directory
    try { ExtensionUtils.initTranslations(domain); } catch (_) {}
    try {
      const localePath = `${Me.path}/locale`;
      if (Gettext.bindtextdomain) Gettext.bindtextdomain(domain, localePath);
      if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(domain, 'UTF-8');
      if (Gettext.textdomain) Gettext.textdomain(domain);
    } catch (_) {}
    // Ensure '_' follows the freshly bound domain for this prefs session
    try { _ = Gettext.domain(domain).gettext; } catch (_) {}
  } catch (_) {}

  // Now that gettext is bound for this process/locale, load page builders so
  // they capture the correct translation context.
  let buildGeneralPage = null;
  let buildPanelPage = null;
  let buildPresetsPage = null;
  let buildRepeatPage = null;
  try { buildGeneralPage = Me.imports.prefs_pages.general.buildGeneralPage; } catch (_) {}
  try { buildPanelPage = Me.imports.prefs_pages.panel.buildPanelPage; } catch (_) {}
  try { buildPresetsPage = Me.imports.prefs_pages.presets.buildPresetsPage; } catch (_) {}
  try { buildRepeatPage = Me.imports.prefs_pages.repeat.buildRepeatPage; } catch (_) {}

  // Modular fast-path: if all builders are available, build pages and return
  try {
    if (buildGeneralPage && buildPanelPage && buildPresetsPage && buildRepeatPage) {
      const pageGeneral = buildGeneralPage(settings);
      const pagePanel = buildPanelPage(settings);
      const pagePresets = buildPresetsPage(settings);
      const pageRepeat = buildRepeatPage(settings);
      window.add(pageGeneral);
      window.add(pagePanel);
      window.add(pagePresets);
      window.add(pageRepeat);
      // Add Diagnostics only if explicitly enabled or debug is on
      try {
        const showDiag = settings.get_boolean('show-diagnostics');
        const dbg = settings.get_boolean('debug');
        if (buildDiagnosticsPage && (showDiag || dbg))
          window.add(buildDiagnosticsPage(settings, window));
      } catch (_) {}
      // About page
      const pageAbout = new Adw.PreferencesPage({ title: _('About'), icon_name: 'help-about-symbolic' });
      const grpAbout = new Adw.PreferencesGroup({ title: _('About') });
      const aboutRow = new Adw.ActionRow({ subtitle: _('For feature requests or bug reports, please visit GitHub. No warranty, express or implied.') });
      const linksBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
      try {
        const Me = ExtensionUtils.getCurrentExtension();
        const repoUrl = Me.metadata['url'] || 'https://github.com/';
        const issuesUrl = (repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl) + '/issues';
        const btnRepo = new Gtk.LinkButton({ label: _('GitHub'), uri: repoUrl });
        const btnIssues = new Gtk.LinkButton({ label: _('Issues'), uri: issuesUrl });
        const btnDonate = new Gtk.LinkButton({ label: _('Donate'), uri: 'https://paypal.me/' });
        linksBox.append(btnRepo);
        linksBox.append(btnIssues);
        linksBox.append(btnDonate);
      } catch (_) {}
      aboutRow.add_suffix(linksBox);
      grpAbout.add(aboutRow);
      pageAbout.add(grpAbout);
      window.add(pageAbout);
      try { window.present(); } catch (_) {}
      return;
    }
  } catch (_) {}

  // --- Page: General (Notifications & Sound) ---
  const pageGeneral = new Adw.PreferencesPage({ title: _('General'), icon_name: 'preferences-system-symbolic' });

  // --- Notifications & Sound ---
  const grpNotify = new Adw.PreferencesGroup({ title: _('Notifications & Sound') });

  const rowNotif = new Adw.ActionRow({ title: _('Enable notifications') });
  const swNotif = new Gtk.Switch({ valign: Gtk.Align.CENTER });
  swNotif.active = settings.get_boolean('enable-notification');
  swNotif.connect('notify::active', w => settings.set_boolean('enable-notification', w.active));
  rowNotif.add_suffix(swNotif);
  rowNotif.activatable_widget = swNotif;
  grpNotify.add(rowNotif);

  const rowSound = new Adw.ActionRow({ title: _('Enable sound') });
  const swSound = new Gtk.Switch({ valign: Gtk.Align.CENTER });
  swSound.active = settings.get_boolean('enable-sound');
  swSound.connect('notify::active', w => settings.set_boolean('enable-sound', w.active));
  rowSound.add_suffix(swSound);
  rowSound.activatable_widget = swSound;
  grpNotify.add(rowSound);

  const rowVolume = new Adw.ActionRow({ title: _('Volume') });
  const scaleVolume = new Gtk.Scale({
    adjustment: new Gtk.Adjustment({ lower: 0, upper: 100, step_increment: 1, page_increment: 10, value: settings.get_int('volume') }),
    draw_value: true,
    hexpand: true,
  });
  scaleVolume.connect('value-changed', s => settings.set_int('volume', Math.round(s.get_value())));
  rowVolume.add_suffix(scaleVolume);
  grpNotify.add(rowVolume);

  // Default sound filename (kept internally for custom path, hidden by default)
  const rowDefSound = new Adw.ActionRow({ title: _('Custom sound path (relative or absolute)') });
  const entrySound = new Gtk.Entry({ hexpand: true });
  entrySound.set_text(settings.get_string('default-sound'));
  entrySound.connect('changed', e => settings.set_string('default-sound', e.get_text()));
  rowDefSound.add_suffix(entrySound);
  grpNotify.add(rowDefSound);
  try { rowDefSound.set_visible(false); } catch (_) {}

  // Choose from multiple available sounds (embedded + common Freedesktop)
  const rowSoundPicker = new Adw.ActionRow({ title: _('Sound') });
  // Discover available sounds
  const soundChoices = [];
  const pushIfExists = (label, pathOrName) => {
    try {
      // For embedded relative names, store as-is; for absolute paths, verify exists
      if (pathOrName.startsWith('/')) {
        const f = Gio.File.new_for_path(pathOrName);
        if (!f.query_exists(null)) return;
      }
      soundChoices.push([label, pathOrName]);
    } catch (_) {}
  };
  try {
    // Embedded sounds under extensions directory
    const dir = Gio.File.new_for_path(`${Me.path}/sounds`);
    const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
      const name = info.get_name();
      if (name.match(/\.(oga|ogg|wav)$/i)) pushIfExists(`Embedded: ${name}`, name);
    }
  } catch (_) {}
  // Common Freedesktop sounds
  pushIfExists(_('System: complete'), '/usr/share/sounds/freedesktop/stereo/complete.oga');
  pushIfExists(_('System: bell'), '/usr/share/sounds/freedesktop/stereo/bell.oga');
  pushIfExists(_('System: message-new-instant'), '/usr/share/sounds/freedesktop/stereo/message-new-instant.oga');
  pushIfExists(_('System: dialog-information'), '/usr/share/sounds/freedesktop/stereo/dialog-information.oga');
  pushIfExists(_('System: alarm-clock-elapsed'), '/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga');

  // Add a Custom... entry at the end
  soundChoices.push([_('Custom…'), '__custom__']);
  const ddLabels = soundChoices.map(([label]) => label);
  const dd = Gtk.DropDown.new_from_strings(ddLabels.length > 0 ? ddLabels : ['(no sounds found)']);
  if (ddLabels.length > 0) {
    // Preselect current default-sound if present
    try {
      const cur = settings.get_string('default-sound') || '';
      let idx = soundChoices.findIndex(([_, val]) => val === cur || (val.startsWith('/') && val.endsWith(cur)));
      if (idx < 0 && cur.startsWith('/')) {
        // If current is an absolute path not in the list, preselect Custom…
        const cidx = soundChoices.findIndex(([_, v]) => v === '__custom__');
        if (cidx >= 0) idx = cidx;
      }
      dd.set_selected(idx >= 0 ? idx : 0);
      // Show custom path field only when custom is selected
      const isCustom = soundChoices[dd.get_selected()] && soundChoices[dd.get_selected()][1] === '__custom__';
      try { rowDefSound.set_visible(isCustom); } catch (_) {}
    } catch (_) { dd.set_selected(0); }
    dd.connect('notify::selected', d => {
      const i = d.get_selected();
      if (i < 0 || i >= soundChoices.length) return;
      const val = soundChoices[i][1];
      const isCustom = (val === '__custom__');
      // Toggle custom path row visibility
      try { rowDefSound.set_visible(isCustom); } catch (_) {}
      // Keep Custom… button always enabled for clarity
      try { btnCustom.set_sensitive(true); } catch (_) {}
      if (isCustom) return; // user will pick a file with the button
      settings.set_string('default-sound', val);
      try { entrySound.set_text(val); } catch (_) {}
    });
  } else {
    dd.set_sensitive(false);
  }
  // Preview button and Custom… file chooser (no redundancy)
  const btnPlay = new Gtk.Button({ label: _('Preview') });
  btnPlay.connect('clicked', () => {
    try {
      const n = Notifier ? new Notifier(Me.path) : null;
      const useSound = settings.get_boolean('enable-sound');
      const vol = settings.get_int('volume');
      let file = settings.get_string('default-sound') || 'bell.oga';
      // If absolute path and exists, pass as-is; if relative and exists in sounds/, keep relative
      try {
        const abs = file.startsWith('/') ? file : `${Me.path}/sounds/${file}`;
        const f = Gio.File.new_for_path(abs);
        if (!file.startsWith('/') && f.query_exists(null)) {
          // prefer relative for embedded sounds (Notifier resolves it)
        } else if (file.startsWith('/') && f.query_exists(null)) {
          // absolute valid path, keep it so Notifier/paplay can use it
        }
      } catch (_) {}
      if (n) {
        n.notify('yrtimer', _('Sound preview'), { soundEnabled: useSound, soundFile: file, volume: vol });
        return;
      }
    } catch (_) {}
    // fallback chain: canberra-gtk-play, paplay, gst-play
    try {
      const file = settings.get_string('default-sound') || 'bell.oga';
      const path = file.startsWith('/') ? file : `${Me.path}/sounds/${file}`;
      const exists = p => { try { return Gio.File.new_for_path(p).query_exists(null); } catch (_) { return false; } };
      const inPath = prog => { try { return GLib.find_program_in_path(prog) !== null; } catch (_) { return false; } };
      const spawn = cmd => { try { GLib.spawn_command_line_async(cmd); return true; } catch (_) { return false; } };
      if (inPath('canberra-gtk-play') && exists(path) && spawn(`canberra-gtk-play -f "${path}"`)) return;
      if (inPath('canberra-gtk-play') && spawn('canberra-gtk-play -i complete')) return;
      if (inPath('paplay') && exists(path) && spawn(`paplay "${path}"`)) return;
      if (inPath('paplay') && spawn('paplay /usr/share/sounds/freedesktop/stereo/complete.oga')) return;
      if (inPath('gst-play-1.0') && exists(path) && spawn(`gst-play-1.0 --quiet "${path}"`)) return;
      if (inPath('gst-launch-1.0') && spawn('gst-launch-1.0 -q audiotestsrc num-buffers=100 ! audioresample ! autoaudiosink')) return;
    } catch (_) {}
  });
  const btnCustom = new Gtk.Button({ label: _('Custom…') });
  try { btnCustom.set_sensitive(true); } catch (_) {}
  btnCustom.connect('clicked', () => {
    try {
      // Prefer Native chooser, parented to prefs window
      const chooser = new Gtk.FileChooserNative({
        title: _('Select sound file'),
        action: Gtk.FileChooserAction.OPEN,
        transient_for: window,
        modal: true,
      });
      const filter = new Gtk.FileFilter();
      filter.set_name(_('Audio'));
      filter.add_mime_type('audio/x-vorbis+ogg');
      filter.add_mime_type('audio/ogg');
      filter.add_mime_type('audio/x-wav');
      filter.add_pattern('*.oga');
      filter.add_pattern('*.ogg');
      filter.add_pattern('*.wav');
      chooser.add_filter(filter);
      chooser.connect('response', (dlg, resp) => {
        if (resp === Gtk.ResponseType.ACCEPT) {
          const file = dlg.get_file();
          if (!file) return;
          const path = file.get_path();
          let toStore = path;
          // If inside extension sounds dir, store as relative filename
          try {
            const soundsDir = `${Me.path}/sounds/`;
            if (path && path.startsWith(soundsDir)) toStore = path.substring(soundsDir.length);
          } catch (_) {}
          settings.set_string('default-sound', toStore);
          try { entrySound.set_text(toStore); } catch (_) {}
          // Reveal the custom path row for transparency
          try { rowDefSound.set_visible(true); } catch (_) {}
          // Update dropdown selection to Custom… and keep it enabled
          const idx = soundChoices.findIndex(([_, v]) => v === '__custom__');
          if (idx >= 0) dd.set_selected(idx);
          try { btnCustom.set_sensitive(true); } catch (_) {}
        }
        try { dlg.destroy(); } catch (_) {}
      });
      chooser.show();
    } catch (e1) {
      // Fallback to FileChooserDialog if Native not available
      try {
        const dialog = new Gtk.FileChooserDialog({
          title: _('Select sound file'),
          action: Gtk.FileChooserAction.OPEN,
          transient_for: window,
          modal: true,
        });
        dialog.add_button(_('_Cancel'), Gtk.ResponseType.CANCEL);
        dialog.add_button(_('_Open'), Gtk.ResponseType.ACCEPT);
        const filter = new Gtk.FileFilter();
        filter.set_name(_('Audio'));
        filter.add_mime_type('audio/x-vorbis+ogg');
        filter.add_mime_type('audio/ogg');
        filter.add_mime_type('audio/x-wav');
        filter.add_pattern('*.oga');
        filter.add_pattern('*.ogg');
        filter.add_pattern('*.wav');
        dialog.add_filter(filter);
        dialog.connect('response', (dlg, resp) => {
          if (resp === Gtk.ResponseType.ACCEPT) {
            const file = dlg.get_file();
            if (file) {
              const path = file.get_path();
              let toStore = path;
              try {
                const soundsDir = `${Me.path}/sounds/`;
                if (path && path.startsWith(soundsDir)) toStore = path.substring(soundsDir.length);
              } catch (_) {}
              settings.set_string('default-sound', toStore);
              try { entrySound.set_text(toStore); } catch (_) {}
              try { rowDefSound.set_visible(true); } catch (_) {}
              const idx = soundChoices.findIndex(([_, v]) => v === '__custom__');
              if (idx >= 0) dd.set_selected(idx);
            }
          }
          try { dlg.destroy(); } catch (_) {}
        });
        dialog.show();
      } catch (e2) {
        log(`[yrtimer] prefs: Custom chooser failed: ${e1} / ${e2}`);
      }
    }
  });
  const soundBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
  soundBox.append(dd);
  soundBox.append(btnCustom);
  soundBox.append(btnPlay);
  rowSoundPicker.add_suffix(soundBox);
  grpNotify.add(rowSoundPicker);

  pageGeneral.add(grpNotify);

  // Global Reset group: centralize all "restore defaults" in one place
  const grpResetAll = new Adw.PreferencesGroup({ title: _('Reset') });
  const rowResetAll = new Adw.ActionRow({ subtitle: _('Restore all settings to schema defaults') });
  const btnResetAll = new Gtk.Button({ label: _('Restore all defaults') });
  btnResetAll.connect('clicked', () => {
    try {
      // Reset all known keys
      const keys = [
        'enable-notification', 'enable-sound', 'volume', 'default-sound',
        'panel-style', 'display-format', 'position-in-panel', 'panel-spacing',
        'presets', 'repeat-enabled', 'repeat-count', 'repeat-interval-seconds', 'debug',
      ];
      keys.forEach(k => { try { settings.reset(k); } catch (_) {} });

      // Refresh UI controls with current values
      try { swNotif.active = settings.get_boolean('enable-notification'); } catch (_) {}
      try { swSound.active = settings.get_boolean('enable-sound'); } catch (_) {}
      try { scaleVolume.set_value(settings.get_int('volume')); } catch (_) {}

      // Sound dropdown and path
      try {
        const cur = settings.get_string('default-sound') || '';
        entrySound.set_text(cur);
        // Re-select in dropdown if present; else select Custom… and reveal path
        let idx = soundChoices.findIndex(([_, val]) => val === cur || (val.startsWith('/') && val.endsWith(cur)));
        if (idx < 0 && cur.startsWith('/')) {
          const cidx = soundChoices.findIndex(([_, v]) => v === '__custom__');
          if (cidx >= 0) idx = cidx;
        }
        if (idx >= 0) dd.set_selected(idx); else dd.set_selected(0);
        const isCustom = soundChoices[dd.get_selected()] && soundChoices[dd.get_selected()][1] === '__custom__';
        try { rowDefSound.set_visible(isCustom); } catch (_) {}
      } catch (_) {}

      // Panel & Display
      try { ddPanel.set_selected(['icon','text','both'].indexOf(settings.get_string('panel-style'))); } catch (_) {}
      try {
        const fmtOptions = ['auto', 'mm:ss', 'hh:mm:ss', 'hide-hours-if-zero'];
        ddFmt.set_selected(fmtOptions.indexOf(settings.get_string('display-format')));
      } catch (_) {}
      try { ddPos.set_selected(Math.max(0, Math.min(4, settings.get_int('position-in-panel')))); } catch (_) {}
      try { scaleSpacing.set_value(settings.get_int('panel-spacing')); } catch (_) {}

      // Presets
      try {
        const arr = settings.get_value('presets').deep_unpack();
        const txt = arr.map(sec => sec % 60 === 0 ? String(Math.round(sec / 60)) : `${sec}s`).join(', ');
        entryPresets.set_text(txt);
      } catch (_) {}

      // Repetition
      try { swRepeat.active = settings.get_boolean('repeat-enabled'); } catch (_) {}
      try { spinCount.set_value(settings.get_int('repeat-count')); } catch (_) {}
      try { spinInterval.set_value(settings.get_int('repeat-interval-seconds')); } catch (_) {}

      // Debug
      try { swDebug.active = settings.get_boolean('debug'); } catch (_) {}
    } catch (e) {
      log(`[yrtimer] prefs reset-all error: ${e}`);
    }
  });
  rowResetAll.add_suffix(btnResetAll);
  grpResetAll.add(rowResetAll);
  pageGeneral.add(grpResetAll);

  // --- Page: Panel & Display ---
  const pagePanel = new Adw.PreferencesPage({ title: _('Panel & Display'), icon_name: 'preferences-system-time-symbolic' });
  const grpPanel = new Adw.PreferencesGroup({ title: _('Panel & Display') });

  const rowPanelStyle = new Adw.ActionRow({ title: _('Panel style (icon/text/both)') });
  const panelOptions = ['icon', 'text', 'both'];
  const ddPanel = Gtk.DropDown.new_from_strings(panelOptions);
  ddPanel.set_selected(panelOptions.indexOf(settings.get_string('panel-style')));
  ddPanel.connect('notify::selected', d => settings.set_string('panel-style', panelOptions[d.get_selected()]));
  rowPanelStyle.add_suffix(ddPanel);
  grpPanel.add(rowPanelStyle);

  const rowFormat = new Adw.ActionRow({ title: _('Display format') });
  const fmtOptions = ['auto', 'mm:ss', 'hh:mm:ss', 'hide-hours-if-zero'];
  const ddFmt = Gtk.DropDown.new_from_strings(fmtOptions);
  ddFmt.set_selected(fmtOptions.indexOf(settings.get_string('display-format')));
  ddFmt.connect('notify::selected', d => settings.set_string('display-format', fmtOptions[d.get_selected()]));
  rowFormat.add_suffix(ddFmt);
  grpPanel.add(rowFormat);

  // Position in top panel (copy Vitals positions)
  const rowPosition = new Adw.ActionRow({ title: _('Position in panel') });
  const posLabels = [_('Left'), _('Center'), _('Right'), _('Far left'), _('Far right')];
  const ddPos = Gtk.DropDown.new_from_strings(posLabels);
  try {
    const currentPos = settings.get_int('position-in-panel');
    ddPos.set_selected(Math.max(0, Math.min(posLabels.length - 1, currentPos)));
  } catch (_) { ddPos.set_selected(2); }
  ddPos.connect('notify::selected', d => settings.set_int('position-in-panel', d.get_selected()));
  rowPosition.add_suffix(ddPos);
  grpPanel.add(rowPosition);

  // Panel spacing (pixels)
  const rowSpacing = new Adw.ActionRow({ title: _('Panel spacing (px)') });
  const scaleSpacing = new Gtk.Scale({
    adjustment: new Gtk.Adjustment({ lower: 0, upper: 16, step_increment: 1, page_increment: 2, value: settings.get_int('panel-spacing') || 4 }),
    draw_value: true,
    hexpand: true,
  });
  scaleSpacing.connect('value-changed', s => settings.set_int('panel-spacing', Math.round(s.get_value())));
  rowSpacing.add_suffix(scaleSpacing);
  grpPanel.add(rowSpacing);

  pagePanel.add(grpPanel);

  // --- Page: Presets ---
  const pagePresets = new Adw.PreferencesPage({ title: _('Presets'), icon_name: 'document-edit-symbolic' });
  const grpPresets = new Adw.PreferencesGroup({ title: _('Presets (comma-separated)') });
  const rowPresets = new Adw.ActionRow({ subtitle: _('Supports m/s suffix; bare numbers = minutes. Examples: 1s, 4m, 5m, 10, 25') });
  const entryPresets = new Gtk.Entry({ hexpand: true });
  try {
    const arr = settings.get_value('presets').deep_unpack(); // seconds array
    // Render using minutes without suffix for simplicity
    const txt = arr.map(sec => {
      if (sec % 60 === 0) return String(Math.round(sec / 60));
      return `${sec}s`;
    }).join(', ');
    entryPresets.set_text(txt);
  } catch (_) {}
  const btnSavePresets = new Gtk.Button({ label: _('Save') });
  btnSavePresets.connect('clicked', () => {
    const raw = String(entryPresets.get_text() || '');
    const tokens = raw.split(',').map(s => s.trim()).filter(Boolean);
    const secs = [];
    for (const tk of tokens) {
      const m = tk.match(/^(\d+)\s*([msMS]?)$/);
      if (!m) continue;
      const num = parseInt(m[1], 10);
      const unit = (m[2] || 'm').toLowerCase(); // default minutes
      const val = unit === 's' ? num : num * 60;
      if (Number.isFinite(val) && val > 0) secs.push(val);
    }
    if (secs.length === 0) return; // ignore empty/invalid
    const variant = new GLib.Variant('ai', secs);
    settings.set_value('presets', variant);
  });
  rowPresets.add_suffix(entryPresets);
  rowPresets.add_suffix(btnSavePresets);
  grpPresets.add(rowPresets);
  pagePresets.add(grpPresets);

  // --- Page: Repetition ---
  const pageRepeat = new Adw.PreferencesPage({ title: _('Repetition'), icon_name: 'media-playlist-repeat-symbolic' });
  const grpRepeat = new Adw.PreferencesGroup({ title: _('Repetition on completion') });

  const rowRepeat = new Adw.ActionRow({ title: _('Enable repetition') });
  const swRepeat = new Gtk.Switch({ valign: Gtk.Align.CENTER });
  swRepeat.active = settings.get_boolean('repeat-enabled');
  swRepeat.connect('notify::active', w => settings.set_boolean('repeat-enabled', w.active));
  rowRepeat.add_suffix(swRepeat);
  rowRepeat.activatable_widget = swRepeat;
  grpRepeat.add(rowRepeat);

  const rowCount = new Adw.ActionRow({ title: _('Repeat count') });
  const spinCount = new Gtk.SpinButton({ adjustment: new Gtk.Adjustment({ lower: 0, upper: 10, step_increment: 1, value: settings.get_int('repeat-count') }) });
  spinCount.connect('value-changed', w => settings.set_int('repeat-count', w.get_value_as_int()))
  rowCount.add_suffix(spinCount);
  grpRepeat.add(rowCount);

  const rowInterval = new Adw.ActionRow({ title: _('Repeat interval (seconds)') });
  const spinInterval = new Gtk.SpinButton({ adjustment: new Gtk.Adjustment({ lower: 1, upper: 600, step_increment: 1, value: settings.get_int('repeat-interval-seconds') }) });
  spinInterval.connect('value-changed', w => settings.set_int('repeat-interval-seconds', w.get_value_as_int()))
  rowInterval.add_suffix(spinInterval);
  grpRepeat.add(rowInterval);

  pageRepeat.add(grpRepeat);

  // --- Page: Diagnostics (modularized) ---
  if (buildDiagnosticsPage) {
    // Add pages to window as tabs/sections (like Caffeine)
    window.add(pageGeneral);
    window.add(pagePanel);
    window.add(pagePresets);
    window.add(pageRepeat);
    try {
      const showDiag = settings.get_boolean('show-diagnostics');
      const dbg = settings.get_boolean('debug');
      if (showDiag || dbg) {
        const pageDiag = buildDiagnosticsPage(settings, window);
        window.add(pageDiag);
      }
    } catch (_) {}
  } else {
    // Fallback: keep existing pages without diagnostics
    window.add(pageGeneral);
    window.add(pagePanel);
    window.add(pagePresets);
    window.add(pageRepeat);
  }

  // --- Page: About ---
  const pageAbout = new Adw.PreferencesPage({ title: _('About'), icon_name: 'help-about-symbolic' });
  const grpAbout = new Adw.PreferencesGroup({ title: _('About') });

  const aboutRow = new Adw.ActionRow({
    subtitle: _('For feature requests or bug reports, please visit GitHub. No warranty, express or implied.')
  });
  const linksBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
  try {
    const Me = ExtensionUtils.getCurrentExtension();
    const repoUrl = Me.metadata['url'] || 'https://github.com/';
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

var init = init;
var fillPreferencesWindow = fillPreferencesWindow;
