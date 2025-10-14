// ESM port — extension.js (GNOME Shell 45+)
// This file mirrors the legacy extension.js but uses ESM imports/exports.
// It is located under work/migration/v2/src-esm/ during the migration phase.
// Once validated, it will replace the root-level extension.js.

// GI modules
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// GNOME Shell modules
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';


// Internal modules
import { Indicator as IndicatorClass } from './ui/indicator.js';
export default class ExtensionImpl extends Extension {
  enable() {
    const baseDir = this.path;
    console.log('[yrtimer] enable() entered');

    const IndicatorCtor = IndicatorClass;
    this._settings = this.getSettings();

    if (this._settings) {
      const style = this._settings.get_string('panel-style');
      if (!style || style === '') this._settings.set_string('panel-style', 'both');
    }

    this._indicator = IndicatorCtor ? new IndicatorCtor(this) : null;
    if (this._indicator) {
      GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        this._indicator.addToPanel();
        return GLib.SOURCE_REMOVE;
      });
    }

    // State restore/persist removed to avoid JSON parsing and try/catch.
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._settings = null;
  }
}
