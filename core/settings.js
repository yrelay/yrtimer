// ESM port — core/settings.js (GNOME Shell 45+)
// Provide a simple helper to get the extension GSettings instance.

import * as ExtensionUtils from './extensionUtilsCompat.js';
import Gio from 'gi://Gio';

const SCHEMA_ID = 'org.gnome.shell.extensions.yrtimer';

export function getSettings() {
  try {
    // metadata.json settings-schema should resolve this schema
    return ExtensionUtils.getSettings();
  } catch (e) {
    // Fallback: manually load schema from extension's schemas directory
    try {
      const file = Gio.File.new_for_uri(import.meta.url); // core/settings.js
      const coreDir = file.get_parent();
      const rootDir = coreDir.get_parent();
      const schemasPath = `${rootDir.get_path()}/schemas`;
      const dir = Gio.File.new_for_path(schemasPath);
      if (!dir.query_exists(null))
        throw new Error(`schemas directory not found at ${schemasPath}`);
      const parentSource = Gio.SettingsSchemaSource.get_default();
      const schemaSource = Gio.SettingsSchemaSource.new_from_directory(schemasPath, parentSource, false);
      const schema = schemaSource.lookup(SCHEMA_ID, true);
      if (!schema)
        throw new Error(`schema '${SCHEMA_ID}' not found in ${schemasPath}`);
      return new Gio.Settings({ settings_schema: schema });
    } catch (ee) {
      throw new Error(`GSettings schema '${SCHEMA_ID}' not found. Compile schemas first. Details: ${ee}`);
    }
  }
}
