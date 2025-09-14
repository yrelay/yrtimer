# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning where applicable.

## [Unreleased]
### Added
- i18n: activation et compilation de nouvelles locales dans `po/LINGUAS`:
  - `pl`, `nl`, `nb`, `fi`, `he`

### Changed
- i18n: complétion de `pt_PT.po` (chaînes essentielles: menu icône, préférences, diagnostics, répétition, panneau, presets)
- i18n: correction de `en_GB.po` (nettoyage de résidus FR, ajout de la clé « Override locale for preferences »)
- i18n: complétion de `zh_HK.po` (menu icône + préférences, clé « Override locale for preferences »)
- i18n: normalisation de la chaîne d’aide de l’icône en 4 segments et ponctuation homogène dans toutes les locales actives:
  - `Left: start/pause, Middle: reset, Shift+Left: last preset, Ctrl+Left: Preferences`
- i18n: mise à jour de `po/LINGUAS` et recompilation avec `make i18n-build` (succès)

### Notes
- `fr.po` est complet et sert de référence (79 messages traduits)
- Tous les `.mo` ont été régénérés sous `locale/<lang>/LC_MESSAGES/yrtimer.mo`

## [1.0.0] - 2025-09-10
- Initial public version (metadata.json version = 1)
- Project organization improvements:
  - Build outputs to `dist/`
  - Modularized preferences UI into `prefs/` (general, panel, presets, repeat, diagnostics)
  - Added GJS unit tests for core timer (`make test`)
  - Added i18n scaffolding (`make i18n-init`, `make i18n-update`, `make i18n-build`)
  - Added LICENSE (GPL-3.0-or-later)

[1.0.0]: https://github.com/ (placeholder)
