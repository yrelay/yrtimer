// ESM stub — prefs_pages/panel.js (GNOME Shell 45+, Adw/Gtk4)
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import Gettext from 'gettext';

export function buildPanelPage(settings) {
  function _getRootPathFromMeta() {
    try {
      const file = Gio.File.new_for_uri(import.meta.url); // prefs_pages/panel.js
      const dir = file.get_parent(); // prefs_pages/
      const root = dir.get_parent(); // extension root
      return root.get_path();
    } catch (_) { return ''; }
  }
  const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer' } };
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

  const page = new Adw.PreferencesPage({ title: _('Panel & Display'), icon_name: 'preferences-system-time-symbolic' });
  const grp = new Adw.PreferencesGroup({ title: _('Panel & Display') });

  // Panel style (icon/text/both)
  const rowPanelStyle = new Adw.ActionRow({ title: _('Panel style (icon/text/both)') });
  const panelOptions = ['icon', 'text', 'both'];
  const ddPanel = Gtk.DropDown.new_from_strings(panelOptions);
  try { ddPanel.set_selected(panelOptions.indexOf(settings.get_string('panel-style'))); } catch (_) {}
  ddPanel.connect('notify::selected', d => settings.set_string('panel-style', panelOptions[d.get_selected()]));
  rowPanelStyle.add_suffix(ddPanel);
  grp.add(rowPanelStyle);

  // Display format
  const rowFormat = new Adw.ActionRow({ title: _('Display format') });
  const fmtOptions = ['auto', 'mm:ss', 'hh:mm:ss', 'hide-hours-if-zero'];
  const ddFmt = Gtk.DropDown.new_from_strings(fmtOptions);
  try { ddFmt.set_selected(fmtOptions.indexOf(settings.get_string('display-format'))); } catch (_) {}
  ddFmt.connect('notify::selected', d => settings.set_string('display-format', fmtOptions[d.get_selected()]));
  rowFormat.add_suffix(ddFmt);
  grp.add(rowFormat);

  // Panel position
  const rowPosition = new Adw.ActionRow({ title: _('Position in panel') });
  const posLabels = [_('Left'), _('Center'), _('Right'), _('Far left'), _('Far right')];
  const ddPos = Gtk.DropDown.new_from_strings(posLabels);
  try { ddPos.set_selected(Math.max(0, Math.min(posLabels.length - 1, settings.get_int('position-in-panel')))); } catch (_) { ddPos.set_selected(2); }
  ddPos.connect('notify::selected', d => settings.set_int('position-in-panel', d.get_selected()));
  rowPosition.add_suffix(ddPos);
  grp.add(rowPosition);

  // Panel spacing
  const rowSpacing = new Adw.ActionRow({ title: _('Panel spacing (px)') });
  const scaleSpacing = new Gtk.Scale({
    adjustment: new Gtk.Adjustment({ lower: 0, upper: 16, step_increment: 1, page_increment: 2, value: settings.get_int('panel-spacing') || 4 }),
    draw_value: true,
    hexpand: true,
  });
  scaleSpacing.connect('value-changed', s => settings.set_int('panel-spacing', Math.round(s.get_value())));
  rowSpacing.add_suffix(scaleSpacing);
  grp.add(rowSpacing);

  page.add(grp);
  return page;
}
