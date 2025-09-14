// prefs/general.js - General (Notifications & Sound)
const { Adw, Gtk, Gio, GLib } = imports.gi;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;

function buildGeneralPage(settings) {
  const Me = ExtensionUtils.getCurrentExtension();
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}
  let Notifier = null;
  try { Notifier = Me.imports.core.notifier.Notifier; } catch (_) {}

  const pageGeneral = new Adw.PreferencesPage({ title: _('General'), icon_name: 'preferences-system-symbolic' });

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

  // Default sound filename (hidden unless Custom… is selected)
  const rowDefSound = new Adw.ActionRow({ title: _('Custom sound path (relative or absolute)') });
  const entrySound = new Gtk.Entry({ hexpand: true });
  entrySound.set_text(settings.get_string('default-sound'));
  entrySound.connect('changed', e => settings.set_string('default-sound', e.get_text()));
  rowDefSound.add_suffix(entrySound);
  grpNotify.add(rowDefSound);
  try { rowDefSound.set_visible(false); } catch (_) {}

  // Sound choices discovery
  const soundChoices = [];
  const pushIfExists = (label, pathOrName) => {
    try {
      if (pathOrName.startsWith('/')) {
        const f = Gio.File.new_for_path(pathOrName);
        if (!f.query_exists(null)) return;
      }
      soundChoices.push([label, pathOrName]);
    } catch (_) {}
  };
  try {
    const dir = Gio.File.new_for_path(`${Me.path}/sounds`);
    const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
      const name = info.get_name();
      if (name.match(/\.(oga|ogg|wav)$/i)) pushIfExists(`${_('Embedded')}: ${name}`, name);
    }
  } catch (_) {}
  pushIfExists(_('System: complete'), '/usr/share/sounds/freedesktop/stereo/complete.oga');
  pushIfExists(_('System: bell'), '/usr/share/sounds/freedesktop/stereo/bell.oga');
  pushIfExists(_('System: message-new-instant'), '/usr/share/sounds/freedesktop/stereo/message-new-instant.oga');
  pushIfExists(_('System: dialog-information'), '/usr/share/sounds/freedesktop/stereo/dialog-information.oga');
  pushIfExists(_('System: alarm-clock-elapsed'), '/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga');

  // Custom…
  soundChoices.push([_('Custom…'), '__custom__']);
  const ddLabels = soundChoices.map(([label]) => label);
  const dd = Gtk.DropDown.new_from_strings(ddLabels.length > 0 ? ddLabels : [_('(no sounds found)')]);
  if (ddLabels.length > 0) {
    try {
      const cur = settings.get_string('default-sound') || '';
      let idx = soundChoices.findIndex(([_, val]) => val === cur || (val.startsWith('/') && val.endsWith(cur)));
      if (idx < 0 && cur.startsWith('/')) {
        const cidx = soundChoices.findIndex(([_, v]) => v === '__custom__');
        if (cidx >= 0) idx = cidx;
      }
      dd.set_selected(idx >= 0 ? idx : 0);
      const isCustom = soundChoices[dd.get_selected()] && soundChoices[dd.get_selected()][1] === '__custom__';
      try { rowDefSound.set_visible(isCustom); } catch (_) {}
    } catch (_) { dd.set_selected(0); }
    dd.connect('notify::selected', d => {
      const i = d.get_selected();
      if (i < 0 || i >= soundChoices.length) return;
      const val = soundChoices[i][1];
      const isCustom = (val === '__custom__');
      try { rowDefSound.set_visible(isCustom); } catch (_) {}
      if (isCustom) return;
      settings.set_string('default-sound', val);
      try { entrySound.set_text(val); } catch (_) {}
    });
  } else {
    dd.set_sensitive(false);
  }

  const btnPlay = new Gtk.Button({ label: _('Preview') });
  btnPlay.connect('clicked', () => {
    try {
      const n = Notifier ? new Notifier(Me.path) : null;
      const useSound = settings.get_boolean('enable-sound');
      const vol = settings.get_int('volume');
      let file = settings.get_string('default-sound') || 'bell.oga';
      if (n) {
        n.notify('yrtimer', _('Sound preview'), { enableNotification: false, enableSound: useSound, volume: vol, soundFile: file });
        return;
      }
    } catch (_) {}
    // CLI fallbacks
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
      const window = null; // not strictly needed, native chooser without parenting
      const chooser = new Gtk.FileChooserNative({ title: _('Select sound file'), action: Gtk.FileChooserAction.OPEN, transient_for: window, modal: true });
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
        try { dlg.destroy(); } catch (_) {}
      });
      chooser.show();
    } catch (_) {}
  });
  const soundBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
  soundBox.append(dd);
  soundBox.append(btnCustom);
  soundBox.append(btnPlay);
  const rowSoundPicker = new Adw.ActionRow({ title: _('Sound') });
  rowSoundPicker.add_suffix(soundBox);
  grpNotify.add(rowSoundPicker);

  pageGeneral.add(grpNotify);

  const grpResetAll = new Adw.PreferencesGroup({ title: _('Reset') });
  const rowResetAll = new Adw.ActionRow({ subtitle: _('Restore all settings to schema defaults') });
  const btnResetAll = new Gtk.Button({ label: _('Restore all defaults') });
  btnResetAll.connect('clicked', () => {
    try {
      const keys = [
        'enable-notification', 'enable-sound', 'volume', 'default-sound',
        'panel-style', 'display-format', 'position-in-panel', 'panel-spacing',
        'presets', 'repeat-enabled', 'repeat-count', 'repeat-interval-seconds', 'debug',
      ];
      keys.forEach(k => { try { settings.reset(k); } catch (_) {} });
      try { swNotif.active = settings.get_boolean('enable-notification'); } catch (_) {}
      try { swSound.active = settings.get_boolean('enable-sound'); } catch (_) {}
      try { scaleVolume.set_value(settings.get_int('volume')); } catch (_) {}
      try {
        const cur = settings.get_string('default-sound') || '';
        entrySound.set_text(cur);
        let idx = soundChoices.findIndex(([_, val]) => val === cur || (val.startsWith('/') && val.endsWith(cur)));
        if (idx < 0 && cur.startsWith('/')) {
          const cidx = soundChoices.findIndex(([_, v]) => v === '__custom__');
          if (cidx >= 0) idx = cidx;
        }
        if (idx >= 0) dd.set_selected(idx); else dd.set_selected(0);
        const isCustom = soundChoices[dd.get_selected()] && soundChoices[dd.get_selected()][1] === '__custom__';
        try { rowDefSound.set_visible(isCustom); } catch (_) {}
      } catch (_) {}
    } catch (e) {
      log(`[yrtimer] prefs reset-all error: ${e}`);
    }
  });
  rowResetAll.add_suffix(btnResetAll);
  grpResetAll.add(rowResetAll);
  pageGeneral.add(grpResetAll);

  return pageGeneral;
}

var buildGeneralPage = buildGeneralPage;
