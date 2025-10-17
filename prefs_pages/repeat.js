// ESM port — prefs_pages/repeat.js (GNOME Shell 45+, Adw/Gtk4)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export function buildRepeatPage(settings) {
  function _getRootPathFromMeta() {
    const file = Gio.File.new_for_uri(import.meta.url); // prefs_pages/repeat.js
    const dir = file.get_parent(); // prefs_pages/
    const root = dir.get_parent(); // extension root
    return root.get_path();
  }
  const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer' } };

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
  return pageRepeat;
}
