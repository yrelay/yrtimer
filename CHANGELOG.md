# Changelog (minimal)

## [2.0.0] - 2025-09-22

Mise à niveau majeure: migration ESM et compatibilité GNOME 45–48, préférences fiabilisées, notifications simplifiées.

- Migration ESM complète (GNOME Shell 45–48).
- Uniformisation Gtk 4.0 / Gdk 4.0 pour les Préférences (suppression des conflits de version).
- Préférences: ouverture fiable depuis l’indicateur (spawn asynchrone via `GLib.spawn_command_line_async`).
- Notifications: utilisation de `Main.notify` uniquement (suppression des écarts `MessageTray`).
- GSettings: fallback robuste depuis `schemas/` si nécessaire.
- Nettoyage: les pages de Préférences ne dépendent plus de `ExtensionUtils`.

## [1.0.0] - 2025-09-10

Première publication publique stable.

- Première version publique.
