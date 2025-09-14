// prefs/panel.js - Panel & Display page
const { Adw, Gtk } = imports.gi;
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;

function buildPanelPage(settings) {
  const Me = ExtensionUtils.getCurrentExtension();
  let _ = (s) => s;
  try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

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

  pagePanel.add(grpPanel);
  return pagePanel;
}

var buildPanelPage = buildPanelPage;
