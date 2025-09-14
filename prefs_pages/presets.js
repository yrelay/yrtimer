// prefs/presets.js - Presets page
const { Adw, Gtk, GLib } = imports.gi;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;

function buildPresetsPage(settings) {
  const Me = ExtensionUtils.getCurrentExtension();
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

  const pagePresets = new Adw.PreferencesPage({ title: _('Presets'), icon_name: 'document-edit-symbolic' });
  const grpPresets = new Adw.PreferencesGroup({ title: _('Presets (comma-separated)') });
  const rowPresets = new Adw.ActionRow({ subtitle: _('Supports m/s suffix; bare numbers = minutes. Examples: 1s, 4m, 5m, 10, 25') });
  const entryPresets = new Gtk.Entry({ hexpand: true });
  try {
    const arr = settings.get_value('presets').deep_unpack(); // seconds array
    const txt = arr.map(sec => (sec % 60 === 0 ? String(Math.round(sec / 60)) : `${sec}s`)).join(', ');
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

var buildPresetsPage = buildPresetsPage;
