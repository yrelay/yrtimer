// ESM port — prefs_pages/presets.js (GNOME Shell 45+, Adw/Gtk4)
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export function buildPresetsPage(settings) {
  function _getRootPathFromMeta() {
    const file = Gio.File.new_for_uri(import.meta.url); // prefs_pages/presets.js
    const dir = file.get_parent(); // prefs_pages/
    const root = dir.get_parent(); // extension root
    return root.get_path();
  }
  const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer' } };

  const pagePresets = new Adw.PreferencesPage({ title: _('Presets'), icon_name: 'document-edit-symbolic' });
  const grpPresets = new Adw.PreferencesGroup({ title: _('Presets (comma-separated)') });
  const rowPresets = new Adw.ActionRow({ subtitle: _('Supports m/s suffix; bare numbers = minutes. Examples: 1s, 4m, 5m, 10, 25') });
  const entryPresets = new Gtk.Entry({ hexpand: true });
  const arr = settings.get_value('presets').deep_unpack(); // seconds array
  const txt = arr.map(sec => (sec % 60 === 0 ? String(Math.round(sec / 60)) : `${sec}s`)).join(', ');
  entryPresets.set_text(txt);
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
    if (secs.length === 0) return;
    const variant = new GLib.Variant('ai', secs);
    settings.set_value('presets', variant);
  });
  rowPresets.add_suffix(entryPresets);
  rowPresets.add_suffix(btnSavePresets);
  grpPresets.add(rowPresets);
  pagePresets.add(grpPresets);
  return pagePresets;
}
