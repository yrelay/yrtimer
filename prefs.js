// ESM port — prefs.js (GNOME Shell 45+, Adw/Gtk4)
// Builds the preferences window using page builders from prefs_pages/*

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { buildGeneralPage } from './prefs_pages/general.js';
import { buildPanelPage } from './prefs_pages/panel.js';
import { buildPresetsPage } from './prefs_pages/presets.js';
import { buildRepeatPage } from './prefs_pages/repeat.js';

function _getRootPathFromMeta() {
  const file = Gio.File.new_for_uri(import.meta.url); // prefs.js
  const dir = file.get_parent();
  return dir ? dir.get_path() : '';
}
const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer', url: 'https://github.com/yrelay/yrtimer' } };

export default class Preferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    // Pages
    const pageGeneral = buildGeneralPage(settings);
    window.add(pageGeneral);

    const pagePanel = buildPanelPage(settings);
    window.add(pagePanel);

    const pagePresets = buildPresetsPage(settings);
    window.add(pagePresets);

    const pageRepeat = buildRepeatPage(settings);
    window.add(pageRepeat);

    // About
    const pageAbout = new Adw.PreferencesPage({ title: _('About'), icon_name: 'help-about-symbolic' });
    const grpAbout = new Adw.PreferencesGroup({ title: _('About') });
    const aboutRow = new Adw.ActionRow({ subtitle: _('For feature requests or bug reports, please visit GitHub. No warranty, express or implied.') });
    const linksBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
    const repoUrl = (Me.metadata && Me.metadata['url']) || 'https://github.com/yrelay/yrtimer';
    const issuesUrl = (repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl) + '/issues';
    const btnRepo = new Gtk.LinkButton({ label: _('GitHub'), uri: repoUrl });
    const btnIssues = new Gtk.LinkButton({ label: _('Issues'), uri: issuesUrl });
    const btnDonate = new Gtk.LinkButton({ label: _('Donate'), uri: 'https://paypal.me/yrelay' });
    linksBox.append(btnRepo);
    linksBox.append(btnIssues);
    linksBox.append(btnDonate);
    aboutRow.add_suffix(linksBox);
    grpAbout.add(aboutRow);
    pageAbout.add(grpAbout);
    window.add(pageAbout);

    window.present();
  }
}
