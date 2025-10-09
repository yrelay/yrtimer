// ESM port — core/settings.js (GNOME Shell 45+)
// Provide a simple helper to get the extension GSettings instance.

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export function getSettings() {
  // GNOME 45+: resolve by module URL
  return Extension.lookupByURL(import.meta.url).getSettings();
}
