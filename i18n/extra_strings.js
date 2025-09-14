// extra_strings.js — catalogue minimal pour forcer l'extraction de certaines chaînes i18n
/*
 Ce fichier est scanné par xgettext via la cible Makefile i18n-update.
 Il permet d'exposer des chaînes qui ne sont pas naturellement parcourues
 par xgettext dans les JS principaux (ex: libellés diagnostic/click-hint).
*/

const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;

(function registerExtraStrings() {
  try {
    const Me = ExtensionUtils.getCurrentExtension();
    const domain = Me?.metadata?.['gettext-domain'] || 'yrtimer';
    const _ = Gettext.domain(domain).gettext;
    // Click-hint (structure normalisée en 4 segments)
    _("Left: start/pause, Middle: reset, Shift+Left: last preset, Ctrl+Left: Preferences");
  } catch (_e) {
    // no-op en extraction
  }
})();
