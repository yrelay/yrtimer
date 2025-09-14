# yrtimer – GNOME Shell Timer Extension

A simple, fast, and reliable countdown timer for the GNOME top bar. Compatible with GNOME 43–48.

## Diagnostics (visible on demand)

- By default, the `Diagnostics` tab is hidden for end-users.
- Two settings control its visibility:
  - `show-diagnostics` (boolean, default `false`) → shows the tab when `true`.
  - `debug` (boolean) → when enabled, also forces the tab to be displayed and enables certain logs/toasts.
- Enable/disable via GSettings from the command line requires using `--schemadir` (extension schemas are local, not global): see next section.
- In the UI, the `debug` toggle is available in the `Diagnostics` page (when visible). You can also expose a `Show Diagnostics` switch elsewhere if needed.

### CLI GSettings (local schemas)

The extension’s GSettings schema is compiled into the installed directory and is not visible to the global `gsettings` tool unless you pass `--schemadir`.

Set values:

```bash
SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/yrtimer@yrelay.fr/schemas"
gsettings --schemadir "$SCHEMA_DIR" set org.gnome.shell.extensions.yrtimer show-diagnostics true
gsettings --schemadir "$SCHEMA_DIR" set org.gnome.shell.extensions.yrtimer debug true
```

Get/list values:

```bash
gsettings --schemadir "$SCHEMA_DIR" get org.gnome.shell.extensions.yrtimer show-diagnostics
gsettings --schemadir "$SCHEMA_DIR" list-keys org.gnome.shell.extensions.yrtimer
```

If needed, recompile schemas in the installed directory, then retry:

```bash
glib-compile-schemas "$SCHEMA_DIR"/
```

## Features

- Top bar indicator with remaining time (icon/text configurable)
- Start / Pause / Reset
- Free-form duration input (e.g., `5`, `1m 12s`, `01:12:00`, `2h 30m`)
- Presets via GSettings
- Notification at expiration and optional sound
- Optional repetition (interval/count)
- Persistence of last state (resume as PAUSED after Shell restart)

## Project structure

```text
yrtimer/
├─ metadata.json
├─ extension.js
├─ prefs.js
├─ ui/
│  ├─ menu.js
│  └─ indicator.js
├─ core/
│  ├─ timer.js
│  ├─ notifier.js
│  └─ settings.js
├─ schemas/
│  └─ org.gnome.shell.extensions.yrtimer.gschema.xml
├─ sounds/
│  └─ bell.oga
├─ locale/
├─ stylesheet.css
└─ README.md
```

## Requirements

- GNOME Shell 45–48
- gjs, glib2 (compile-schemas), gnome-extensions CLI, gettext
- Optional: GSound (for sound playback), canberra-gtk-play (fallback)

## Build and install

1. Compile schemas

```bash
make schemas
```

1. Pack the extension (zip)

```bash
make pack
```

1. Install the zip

```bash
make install
```

The zip archive is generated into the `dist/` directory at the repository root, e.g. `dist/yrtimer@yrelay.fr.shell-extension.zip`.

1. Reload GNOME Shell

- Xorg: Press Alt+F2, type `r`, Enter
- Wayland: Log out and log back in

## Development notes

- All user-facing strings must go through gettext; English is the baseline.
- Avoid private/unstable GNOME Shell APIs; test across GNOME 45–48.
- No CPU work while idle; 1 Hz tick when running.

## License

GPL-3.0 (recommended). You may switch to MIT if needed.
