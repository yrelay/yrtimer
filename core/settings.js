// core/settings.js - legacy GJS for GNOME 43
const ExtensionUtils = imports.misc.extensionUtils;

const SCHEMA_ID = 'org.gnome.shell.extensions.yrtimer';

function getSettings() {
  // Rely on metadata.json settings-schema to resolve
  try {
    return ExtensionUtils.getSettings();
  } catch (e) {
    throw new Error(`GSettings schema '${SCHEMA_ID}' not found. Compile schemas first.`);
  }
}
