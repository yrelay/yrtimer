// extra_strings.js — catalogue minimal pour xgettext (GNOME 45+, ESM)
//
// Ce fichier n'est pas exécuté au runtime. Il sert uniquement à exposer des
// chaînes à xgettext via la cible Makefile `i18n-update`.
// xgettext détecte les appels statiques à _("...").

// Définition factice de _ pour l'analyse statique par xgettext
const _ = (s) => s;

// Click-hint (structure normalisée en 4 segments)
_("Left: start/pause, Middle: reset, Shift+Left: last preset, Ctrl+Left: Preferences");
