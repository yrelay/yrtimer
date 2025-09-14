// ui/indicator.js - legacy imports for GNOME 43
// Indicator in the GNOME top bar with a menu to control the timer

const { St, Gio, GLib, GObject, Clutter, Pango } = imports.gi;
const Gettext = imports.gettext;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.core.timer.Timer;
const TimerState = Me.imports.core.timer.TimerState;
const Notifier = Me.imports.core.notifier.Notifier;
const Settings = Me.imports.core.settings;

// i18n
let _ = (s) => s;
try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

// Breadcrumb to confirm module load from the installed copy
try { log('[yrtimer] indicator.js loaded'); } catch (_) {}

// Export symbol with GObject registration (GNOME 43)
var Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
  _init() {
    try { log('[yrtimer] Indicator: before super._init'); } catch (_) {}
    super._init(0.0, 'yrtimer');
    try { log('[yrtimer] Indicator: after super._init'); } catch (_) {}
    this._baseDirPath = Me.path;
    try { log('[yrtimer] Indicator: constructor start'); } catch (_) {}

    // Apply locale override as early as possible so _() uses the right domain/locale
    try { this._applyLocaleOverride(); } catch (_) {}

    // Prefer embedded icon to avoid theme dependency; fallback to a common system icon
    this._icon = new St.Icon({ style_class: 'system-status-icon', y_align: Clutter.ActorAlign.CENTER });
    try {
      const gicon = Gio.icon_new_for_string(`${Me.path}/icons/yrtimer-symbolic.svg`);
      this._icon.gicon = gicon;
    } catch (_) {
      this._icon.icon_name = 'preferences-system-time-symbolic';
    }

    // Create label and container (Vitals-like)
    this._label = new St.Label({ text: '00:00', y_align: Clutter.ActorAlign.CENTER, style_class: 'yrtimer-label' });
    if (this._label.clutter_text && this._label.clutter_text.set_line_alignment)
      this._label.clutter_text.set_line_alignment(Clutter.ActorAlign.CENTER);
    this._box = new St.BoxLayout({ vertical: false, style_class: 'panel-status-menu-box yrtimer-box', y_align: Clutter.ActorAlign.CENTER });
    try { this._box.set_style('spacing: 0px;'); } catch (_) {}
    this._box.add_child(this._icon);
    this._box.add_child(this._label);
    this.add_child(this._box);

    this._label.opacity = 255;
    this._label.x_expand = false;
    this._label.y_expand = true;
    try { this._label.x_align = Clutter.ActorAlign.START; } catch (_) {}
    try {
      const ct = this._label.get_clutter_text();
      ct.ellipsize = Pango.EllipsizeMode.NONE; // prevent 00:... truncation
      ct.set_single_line_mode(true);
      ct.set_line_wrap(false);
      if (ct.set_max_width_chars) ct.set_max_width_chars(-1);
    } catch (_) {}

    // Track max width for stable layout (avoid jitter when time format length changes)
    this._labelMaxWidth = 0;
    // Ensure actor visibility
    this.visible = true;
    this.reactive = true;
    this._box.x_expand = true;
    // Tooltips documenting panel gestures (best effort)
    try {
      const tip = _('Left: start/pause, Middle: reset, Shift+Left: last preset, Ctrl+Left: Preferences');
      if (this._icon.set_tooltip_text) this._icon.set_tooltip_text(tip);
      if (this._label.set_tooltip_text) this._label.set_tooltip_text(tip);
      if (this.set_tooltip_text) this.set_tooltip_text(_('yrtimer indicator'));
    } catch (_) {}
    // Watchdog: if label gets hidden unexpectedly while not in icon mode, force it visible
    this._label.connect('notify::visible', () => {
      try {
        const style = this._settings ? this._settings.get_string('panel-style') : 'both';
        if (style !== 'icon' && !this._label.visible) {
          this._label.visible = true;
          try { log('[yrtimer] label watchdog: restored visibility'); } catch (_) {}
        }
      } catch (_) {}
    });
    try { log('[yrtimer] Indicator: UI nodes created'); } catch (_) {}

    // Accessibility names
    this._icon.set_accessible_name(_('Timer icon'));
    this._label.set_accessible_name(_('Remaining time'));
    this.set_accessible_name(_('yrtimer indicator'));

    this._timer = new Timer((msg) => this._logDebug(msg));
    this._notifier = new Notifier(this._baseDirPath);
    this._settings = null;
    try {
      // Use core/settings.js exported function name
      this._settings = Settings.getSettings ? Settings.getSettings() : null;
      // Fallback to ExtensionUtils if needed
      if (!this._settings) this._settings = ExtensionUtils.getSettings();
    } catch (e) {
      this._logDebug(e);
      try { log(`[yrtimer] settings load failed: ${e}`); } catch (_) {}
    }

    this._timer.onChanged(() => this._updateUI());
    this._repeatSourceId = 0;
    this._repeatLeft = 0;

    this._timer.onElapsed(() => this._handleElapsed());

    this._buildMenu();
    this._updateUI();
    try { log('[yrtimer] Indicator: menu built and UI updated'); } catch (_) {}

    // Listen to preset changes
    if (this._settings) {
      this._settings.connect('changed::presets', () => this._rebuildPresets());
      this._settings.connect('changed::panel-style', () => this._applyPanelStyle());
      this._settings.connect('changed::display-format', () => this._updateUI());
      // Live locale change: rebind gettext and rebuild menu texts
      this._settings.connect('changed::override-locale', () => {
        try { this.menu.close(); } catch (_) {}
        try { this._applyLocaleOverride(); } catch (_) {}
        try {
          // Rebuild menu to update all strings
          this.menu.removeAll();
          // Petit délai pour laisser GNOME finaliser la fermeture du menu
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
            try { this._buildMenu(); this._updateUI(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
          });
        } catch (_) {}
      });
      // Live position update like Vitals
      this._settings.connect('changed::position-in-panel', () => {
        try { this._repositionInPanel(); } catch (_) {}
      });
    }

    // Safety guard: ensure _applyPanelStyle exists (installed copy may lag)
    try { log(`[yrtimer] Indicator: typeof _applyPanelStyle = ${typeof this._applyPanelStyle}`); } catch (_) {}
    if (typeof this._applyPanelStyle !== 'function') {
      try { log('[yrtimer] Indicator: _applyPanelStyle missing, installing fallback'); } catch (_) {}
      this._applyPanelStyle = () => {
        if (this._icon) this._icon.visible = true;
        if (this._label) this._label.visible = true;
      };
    }
    this._applyPanelStyle();
    try { log('[yrtimer] Indicator: constructor end'); } catch (_) {}

    // Quick actions like Vitals: left-click toggle run/pause, middle-click reset
    try {
      // Primary listener on the PanelMenu.Button itself
      this.connect('button-press-event', (actor, event) => {
        const btn = event.get_button();
        try { log(`[yrtimer] panel click: button=${btn} state=${event.get_state && event.get_state()}`); } catch (_) {}
        if (btn === 1) { // left
          // Modifier-aware actions
          try {
            const st = event.get_state ? event.get_state() : 0;
            const CTRL = Clutter.ModifierType.CONTROL_MASK;
            const SHIFT = Clutter.ModifierType.SHIFT_MASK;
            if (st & CTRL) { // Ctrl+Left -> open Preferences
              try { ExtensionUtils.openPrefs(); } catch (_) {}
              return Clutter.EVENT_STOP;
            }
            if (st & SHIFT) { // Shift+Left -> start last preset
              try { this._startLastPreset(); } catch (_) {}
              return Clutter.EVENT_STOP;
            }
          } catch (_) {}
          // Default: toggle run/pause or open menu
          if (this._timer.remaining > 0) {
            if (this._timer.state === 'RUNNING') this._timer.pause();
            else this._timer.start();
          } else {
            this.menu.toggle();
          }
          return Clutter.EVENT_STOP;
        }
        if (btn === 2) { // middle
          this._timer.reset();
          return Clutter.EVENT_STOP;
        }
        if (btn === 3) { // right click -> open preferences directly (like Vitals quick access)
          try { ExtensionUtils.openPrefs(); } catch (_) {}
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      });

      // Also listen on inner actors in case the panel eats events
      const onInnerClick = (actor, event) => {
        const btn = event.get_button();
        try { log(`[yrtimer] inner click on ${actor && actor.toString ? actor.toString() : 'actor'} btn=${btn}`); } catch (_) {}
        if (btn === 1) { this.menu.toggle(); return Clutter.EVENT_STOP; }
        if (btn === 2) { this._timer.reset(); return Clutter.EVENT_STOP; }
        if (btn === 3) { try { ExtensionUtils.openPrefs(); } catch (_) {} return Clutter.EVENT_STOP; }
        return Clutter.EVENT_PROPAGATE;
      };
      try { this._box.reactive = true; this._box.connect('button-press-event', onInnerClick); } catch (_) {}
      try { this._icon.reactive = true; this._icon.connect('button-press-event', onInnerClick); } catch (_) {}
      try { this._label.reactive = true; this._label.connect('button-press-event', onInnerClick); } catch (_) {}
    } catch (_) {}
  }

  // Ensure gettext uses the override locale chosen in preferences, and rebind
  // the translation domain so that subsequent _() calls reflect the change.
  _applyLocaleOverride() {
    try {
      const domain = Me.metadata['gettext-domain'] || 'yrtimer';
      // Lire l'override depuis une NOUVELLE instance de GSettings pour éviter tout cache
      let loc = '';
      try { const s = ExtensionUtils.getSettings(); loc = s.get_string('override-locale') || ''; } catch (_) { loc = ''; }
      // IMPORTANT: On est dans le processus du GNOME Shell.
      // Appliquer LANGUAGE uniquement de façon TEMPORAIRE pendant le rebind, puis restaurer.
      const prevLANGUAGE = GLib.getenv('LANGUAGE') || '';
      const prevLCMSG = GLib.getenv('LC_MESSAGES') || '';
      const prevLANG = GLib.getenv('LANG') || '';
      try {
        if (loc) {
          try { GLib.setenv('LANGUAGE', loc, true); } catch (_) {}
          try { GLib.setenv('LC_MESSAGES', loc, true); } catch (_) {}
          try { GLib.setenv('LANG', loc, true); } catch (_) {}
        }
        // Rebind translations vers le répertoire de l’extension
        try { ExtensionUtils.initTranslations(domain); } catch (_) {}
        try {
          const localePath = `${Me.path}/locale`;
          if (Gettext.bindtextdomain) Gettext.bindtextdomain(domain, localePath);
          if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(domain, 'UTF-8');
          // Ne PAS appeler Gettext.textdomain(domain) pour ne pas changer le domaine global du Shell
        } catch (_) {}
        // Utiliser uniquement le domaine explicite de l’extension
        try { _ = Gettext.domain(domain).gettext; } catch (_) {}
      } finally {
        try { GLib.setenv('LANGUAGE', prevLANGUAGE, true); } catch (_) {}
        try { GLib.setenv('LC_MESSAGES', prevLCMSG, true); } catch (_) {}
        try { GLib.setenv('LANG', prevLANG, true); } catch (_) {}
      }
      // Redéfinir '_' local pour n'affecter que yrtimer: setenv LANGUAGE temporaire par appel
      const locForWrap = loc; const domForWrap = domain;
      _ = (s) => {
        const prevA = GLib.getenv('LANGUAGE') || '';
        const prevB = GLib.getenv('LC_MESSAGES') || '';
        const prevC = GLib.getenv('LANG') || '';
        // Tenter un setlocale temporaire si disponible (GJS expose parfois setlocale)
        let prevLocale = null;
        try { if (Gettext.setlocale) prevLocale = Gettext.setlocale(Gettext.LocaleCategory.ALL, null); } catch (_) {}
        try {
          if (locForWrap) {
            GLib.setenv('LANGUAGE', locForWrap, true);
            GLib.setenv('LC_MESSAGES', locForWrap, true);
            GLib.setenv('LANG', locForWrap, true);
            if (Gettext.setlocale) Gettext.setlocale(Gettext.LocaleCategory.ALL, locForWrap);
          }
        } catch (_) {}
        let out = s;
        try { out = Gettext.dgettext ? Gettext.dgettext(domForWrap, s) : Gettext.domain(domForWrap).gettext(s); } catch (_) {}
        try {
          if (Gettext.setlocale && prevLocale !== null) Gettext.setlocale(Gettext.LocaleCategory.ALL, prevLocale);
          GLib.setenv('LANGUAGE', prevA, true);
          GLib.setenv('LC_MESSAGES', prevB, true);
          GLib.setenv('LANG', prevC, true);
        } catch (_) {}
        return out;
      };
      try { log(`[yrtimer] indicator i18n: locale=${loc||'system'} | Presets='${_('Presets')}' Preferences='${_('Preferences')}'`); } catch (_) {}
      try {
        const probe = _ ? _('[i18n probe] Preferences') : 'n/a';
        log(`[yrtimer] _applyLocaleOverride -> ${loc || 'system default'} | example: ${probe}`);
      } catch (_) {}
    } catch (e) {
      try { log(`[yrtimer] _applyLocaleOverride error: ${e}`); } catch (_) {}
    }
  }

  _rebuildQuickPills() {
    try {
      if (!this._pillsBox) return;
      // Clear existing
      try {
        const children = this._pillsBox.get_children();
        children.forEach(c => { try { this._pillsBox.remove_child(c); } catch (_) {} });
      } catch (_) {}

      let quickPresets = [60, 300, 1500]; // default: 1m, 5m, 25m
      try {
        const arr = this._settings ? this._settings.get_value('presets').deep_unpack() : null;
        if (Array.isArray(arr) && arr.length > 0) {
          const first = arr.slice(0, 3);
          if (first.length > 0) quickPresets = first;
        }
      } catch (_) {}

      const mkPill = (sec) => {
        const lbl = sec >= 60 ? `${Math.floor(sec/60)}m` : `${sec}s`;
        const b = new St.Button({ label: lbl, style_class: 'button yrtimer-pill' });
        b.set_accessible_name(_('Preset') + ' ' + lbl);
        b.connect('clicked', () => { this._timer.start(sec); try { this.menu.close(); } catch (_) {} });
        return b;
      };
      quickPresets.forEach(p => this._pillsBox.add_child(mkPill(p)));
    } catch (e) {
      try { log(`[yrtimer] _rebuildQuickPills error: ${e}`); } catch (_) {}
    }
  }

  _formatRemainingBySetting() {
    try {
      const t = Math.max(0, this._timer.remaining);
      let format = 'auto';
      if (this._settings) format = this._settings.get_string('display-format') || 'auto';
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const s = t % 60;
      if (format === 'mm:ss') return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (format === 'hh:mm:ss') return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (format === 'hide-hours-if-zero') {
        if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }
      // auto
      if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    } catch (_) {
      return this._timer.formatRemaining();
    }
  }

  _handleElapsed() {
    // Read settings
    let enableNotification = true;
    let enableSound = true;
    let volume = 80;
    let soundFile = 'bell.oga';
    let repeatEnabled = false;
    let repeatCount = 0;
    let repeatInterval = 10;
    try {
      if (this._settings) {
        enableNotification = this._settings.get_boolean('enable-notification');
        enableSound = this._settings.get_boolean('enable-sound');
        volume = this._settings.get_int('volume');
        soundFile = this._settings.get_string('default-sound') || 'bell.oga';
        repeatEnabled = this._settings.get_boolean('repeat-enabled');
        repeatCount = this._settings.get_int('repeat-count');
        repeatInterval = this._settings.get_int('repeat-interval-seconds');
      }
    } catch (e) { this._logDebug(e); }

    this._notifier.notify(_('Timer'), _('Time is up!'), { enableNotification, enableSound, volume, soundFile });

    // Setup repetition if enabled
    this._cancelRepeat();
    if (repeatEnabled && repeatCount > 0 && repeatInterval > 0) {
      this._repeatLeft = repeatCount;
      this._repeatSourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, repeatInterval, () => {
        if (this._repeatLeft <= 0) { this._cancelRepeat(); return GLib.SOURCE_REMOVE; }
        this._repeatLeft -= 1;
        this._notifier.notify(_('Timer'), _('Time is up!'), { enableNotification, enableSound, volume, soundFile });
        return GLib.SOURCE_CONTINUE;
      });
    }
  }

  // Start from the entry field: parse duration or resume if already set
  _startFromEntry() {
    try {
      const text = this._entry && (this._entry.get_text ? this._entry.get_text() : this._entry.text);
      const sec = Timer.parseDuration(String(text || '').trim());
      try { log(`[yrtimer] _startFromEntry: text='${text}' sec=${sec}`); } catch (_) {}
      if (sec > 0) this._timer.start(sec);
      else if (this._timer && this._timer.remaining > 0) this._timer.start();
      try { this.menu.close(); } catch (_) {}
    } catch (e) { this._logDebug(e); }
  }

  _cancelRepeat() {
    if (this._repeatSourceId) {
      GLib.source_remove(this._repeatSourceId);
      this._repeatSourceId = 0;
      this._repeatLeft = 0;
    }
  }

  addToPanel() {
    try {
      // First registration into status area (required once)
      let [alignment, gravity] = this._computeAlignment();
      Main.panel.addToStatusArea('yrtimer-indicator', this, gravity, alignment);
      // Re-apply style post-insertion to counter any panel/theme overrides
      try { this._applyPanelStyle(); } catch (_) {}
      try { log(`[yrtimer] Indicator: added to panel (${alignment})`); } catch (_) {}
    } catch (e) {
      this._logDebug(`addToPanel failed: ${e}`);
      try { log(`[yrtimer] addToPanel failed: ${e}`); } catch (_) {}
    }
  }

  _repositionInPanel() {
    try {
      const parent = this.container && this.container.get_parent ? this.container.get_parent() : null;
      if (parent && parent.remove_actor) parent.remove_actor(this.container);
    } catch (e) { try { log(`[yrtimer] remove from parent failed: ${e}`); } catch (_) {} }

    try {
      const [alignment, gravity] = this._computeAlignment();
      const boxes = {
        left: Main.panel._leftBox,
        center: Main.panel._centerBox,
        right: Main.panel._rightBox,
      };
      const box = boxes[alignment] || Main.panel._rightBox;
      const idx = gravity; // -1 (append) or 0 (front), like Vitals
      if (box && box.insert_child_at_index)
        box.insert_child_at_index(this.container, idx);
      else if (box && box.add_child)
        box.add_child(this.container);
      try { this._applyPanelStyle(); } catch (_) {}
      try { log(`[yrtimer] Indicator: repositioned (${alignment}, idx=${idx})`); } catch (_) {}
    } catch (e) { try { log(`[yrtimer] reposition failed: ${e}`); } catch (_) {} }
  }

  _computeAlignment() {
    let alignment = 'right';
    let gravity = 1;
    try {
      if (this._settings) {
        const pos = this._settings.get_int('position-in-panel');
        switch (pos) {
          case 0: alignment = 'left'; gravity = -1; break; // left
          case 1: alignment = 'center'; gravity = -1; break; // center
          case 2: alignment = 'right'; gravity = 0; break; // right (front, near center)
          case 3: alignment = 'left'; gravity = 0; break; // far-left (front, outermost left)
          case 4: alignment = 'right'; gravity = -1; break; // far-right (append, outermost right)
        }
      }
    } catch (_) {}
    return [alignment, gravity];
  }

  _updateUI() {
    const t = this._formatRemainingBySetting();
    this._label.text = t;
    this._logDebug(`[yrtimer] _updateUI -> ${t}`);
    // Toggle state classes for styling
    this.remove_style_class_name('state-idle');
    this.remove_style_class_name('state-running');
    this.remove_style_class_name('state-paused');
    const st = this._timer.state;
    if (st === 'RUNNING') this.add_style_class_name('state-running');
    else if (st === 'PAUSED') this.add_style_class_name('state-paused');
    else this.add_style_class_name('state-idle');
    // Always ensure label is visible when not in icon-only mode
    if (this._label && this._icon) {
      // If style was set to 'icon', _applyPanelStyle contrôle; sinon force visible
      try {
        const style = this._settings ? this._settings.get_string('panel-style') : 'both';
        if (style !== 'icon') this._label.visible = true;
      } catch (_) { this._label.visible = true; }
    }
    // Maintain fixed width to prevent jitter (similar to Vitals fixed-widths)
    try { this._ensureLabelWidth(); } catch (_) {}
  }

  // Apply current panel-style: icon | text | both
  _applyPanelStyle() {
    let style = 'both';
    try {
      if (this._settings)
        style = this._settings.get_string('panel-style') || 'both';
    } catch (_) {}

    const showIcon = style !== 'text';
    const showLabel = style !== 'icon';
    if (this._icon) this._icon.visible = showIcon;
    if (this._label) this._label.visible = showLabel;
    try { log(`[yrtimer] _applyPanelStyle: style=${style} showIcon=${showIcon} showLabel=${showLabel}`); } catch (_) {}
  }

  // Compute a stable width for label based on the largest format (like Vitals)
  _ensureLabelWidth() {
    try {
      // Determine max text according to display-format; default to hh:mm:ss
      let maxText = '88:88:88';
      const remaining = this._timer ? Math.max(0, this._timer.remaining) : 0;
      try {
        const fmt = this._settings ? this._settings.get_string('display-format') : 'auto';
        if (fmt === 'mm:ss') {
          maxText = '88:88';
        } else if (fmt === 'hh:mm:ss') {
          maxText = '88:88:88';
        } else if (fmt === 'hide-hours-if-zero') {
          maxText = remaining >= 3600 ? '88:88:88' : '88:88';
        } else { // auto
          maxText = remaining >= 3600 ? '88:88:88' : '88:88';
        }
      } catch (_) {}

      // Measure offstage using same style
      const tmp = new St.Label({ text: maxText, style_class: 'yrtimer-label' });
      try {
        // Attach temporarily to stage to resolve Pango layout
        global.stage.add_child(tmp);
        const width = tmp.get_clutter_text().width + 0; // minimal padding
        const w = Math.max(48, width);
        if (this._label) {
          // Always set computed width so it can shrink when hours disappear
          this._label.set_width(w);
          this._labelMaxWidth = w;
        }
      } catch (_) {}
      finally {
        try { global.stage.remove_child(tmp); } catch (_) {}
        try { tmp.destroy(); } catch (_) {}
      }
    } catch (_) {}
  }

  _buildMenu() {
    try {
      try {
        // Diagnostics: log some translations to ensure correct domain/locale
        const d1 = _('Presets');
        const d2 = _('Preferences');
        log(`[yrtimer] _buildMenu i18n check -> Presets='${d1}' Preferences='${d2}'`);
      } catch (_) {}
      // Input row
      const item = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      const box = new St.BoxLayout({ vertical: false });

      this._entry = new St.Entry({
        style_class: 'yrtimer-entry',
        can_focus: true,
        x_expand: true,
        hint_text: _('Enter duration (e.g., 1m 12s)'),
      });
      this._entry.set_accessible_name(_('Duration input'));
      // Start when pressing Enter (St.Entry emits 'activate')
      try { this._entry.connect('activate', () => { try { log('[yrtimer] entry.activate'); } catch (_) {} this._startFromEntry(); }); } catch (_) {}
      // Also listen on the inner ClutterText for reliability inside PopupMenu
      try {
        const ct = this._entry.get_clutter_text ? this._entry.get_clutter_text() : null;
        if (ct) {
          try { ct.connect('activate', () => { try { log('[yrtimer] cluttertext.activate'); } catch (_) {} this._startFromEntry(); }); } catch (_) {}
          try {
            ct.connect('key-press-event', (_w, e) => {
              try {
                const sym = e.get_key_symbol ? e.get_key_symbol() : e.get_key_sym();
                try { log(`[yrtimer] key-press on entry: sym=${sym}`); } catch (_) {}
                if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter) {
                  this._startFromEntry();
                  return Clutter.EVENT_STOP;
                }
              } catch (_) {}
              return Clutter.EVENT_PROPAGATE;
            });
          } catch (_) {}
        }
      } catch (_) {}

      box.add_child(this._entry);
      item.add_child(box);
      this.menu.addMenuItem(item);

      // Preset pills (compact quick access)
      const pillsRow = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      this._pillsBox = new St.BoxLayout({ vertical: false });
      pillsRow.add_child(this._pillsBox);
      this.menu.addMenuItem(pillsRow);
      // Build pills now and keep in sync with settings and menu open
      this._rebuildQuickPills();
      try {
        if (this._settings && !this._presetsChangedId)
          this._presetsChangedId = this._settings.connect('changed::presets', () => this._rebuildQuickPills());
      } catch (_) {}
      // Rebuild entirely when locale override changes (domain-local only)
      try {
        if (this._settings && !this._localeChangedId)
          this._localeChangedId = this._settings.connect('changed::override-locale', () => {
            try { this._applyLocaleOverride(); } catch (_) {}
            try {
              this.menu.removeAll();
              this._buildMenu();
              this._updateUI();
            } catch (_) {}
          });
      } catch (_) {}
      try {
        if (!this._menuOpenId)
          this._menuOpenId = this.menu.connect('open-state-changed', (_m, open) => {
            if (open) {
              // Re-apply locale and rebuild texts on each open to avoid stale translations
              try { this._applyLocaleOverride(); } catch (_) {}
              try {
                this.menu.removeAll();
                this._buildMenu();
                this._updateUI();
              } catch (_) {}
              // Ensure quick pills reflect latest presets
              try { this._rebuildQuickPills(); } catch (_) {}
              // Focus the duration entry so Enter can start immediately
              try {
                if (this._entry && this._entry.grab_key_focus) {
                  this._entry.grab_key_focus();
                } else if (global && global.stage && global.stage.set_key_focus) {
                  global.stage.set_key_focus(this._entry);
                }
                // Select existing text for quick overwrite
                try {
                  const ct = this._entry && this._entry.get_clutter_text ? this._entry.get_clutter_text() : null;
                  if (ct) {
                    if (ct.set_cursor_visible) ct.set_cursor_visible(true);
                    if (ct.select_region) ct.select_region(0, -1);
                  }
                } catch (_) {}
              } catch (_) {}
            }
          });
      } catch (_) {}

      // Buttons row (professional minimal): Play + Pause + Reset
      const btnRow = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      const rowBox = new St.BoxLayout({ vertical: false });
      // Icon-only buttons (GNOME-like): use popup-menu-icon with explicit size
      this._mainBtn = new St.Button({ style_class: 'button yrtimer-action' });
      this._pauseBtn = new St.Button({ style_class: 'button yrtimer-action' });
      const resetBtn = new St.Button({ style_class: 'button yrtimer-action' });

      const playIcon = new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'popup-menu-icon', icon_size: 20 });
      const pauseIcon = new St.Icon({ icon_name: 'media-playback-pause-symbolic', style_class: 'popup-menu-icon', icon_size: 20 });
      const resetIcon = new St.Icon({ icon_name: 'view-refresh-symbolic', style_class: 'popup-menu-icon', icon_size: 20 });
      this._mainBtn.set_child(playIcon);
      this._pauseBtn.set_child(pauseIcon);
      resetBtn.set_child(resetIcon);

      this._mainBtn.set_accessible_name(_('Start'));
      this._pauseBtn.set_accessible_name(_('Pause'));
      resetBtn.set_accessible_name(_('Reset'));
      try { this._mainBtn.set_tooltip_text(_('Start')); } catch (_) {}
      try { this._pauseBtn.set_tooltip_text(_('Pause')); } catch (_) {}
      try { resetBtn.set_tooltip_text(_('Reset')); } catch (_) {}

      this._mainBtn.connect('clicked', () => {
        const st = this._timer.state;
        if (st === 'PAUSED') this._timer.start();
        else if (st === 'RUNNING') {
          // Do nothing while running; Pause button handles this action
        } else {
          this._startFromEntry();
        }
      });
      this._pauseBtn.connect('clicked', () => this._timer.pause());
      resetBtn.connect('clicked', () => this._timer.reset());

      rowBox.add_child(this._mainBtn);
      rowBox.add_child(this._pauseBtn);
      rowBox.add_child(resetBtn);
      btnRow.add_child(rowBox);
      this.menu.addMenuItem(btnRow);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Presets submenu
      this._presetsSection = new PopupMenu.PopupSubMenuMenuItem(_('Presets'), true);
      // Réassigner explicitement le label pour éviter tout cache de texte
      try { if (this._presetsSection && this._presetsSection.label) this._presetsSection.label.text = _('Presets'); } catch (_) {}
      this.menu.addMenuItem(this._presetsSection);
      this._rebuildPresets();

      // Separator and Preferences access (like Vitals)
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      const prefsItem = new PopupMenu.PopupImageMenuItem(_('Preferences'), 'preferences-system-symbolic');
      // Réassigner explicitement le label
      try { if (prefsItem && prefsItem.label) prefsItem.label.text = _('Preferences'); } catch (_) {}
      prefsItem.connect('activate', () => {
        try { ExtensionUtils.openPrefs(); } catch (_) {}
      });
      this.menu.addMenuItem(prefsItem);

      // (Donation item retiré sur demande)

    } catch (e) {
      try { log(`[yrtimer] _buildMenu error: ${e}`); } catch (_) {}
      this._logDebug(e);
    }
  }

  _rebuildPresets() {
    if (!this._presetsSection) return;
    this._presetsSection.menu.removeAll();
    let presets = [300, 600, 1500];
    try {
      if (this._settings) presets = this._settings.get_value('presets').deep_unpack();
    } catch (e) {
      this._logDebug(e);
    }
    presets.forEach((p) => {
      const it = new PopupMenu.PopupMenuItem(this._formatPreset(p));
      it.connect('activate', () => {
        try { log(`[yrtimer] Preset selected: ${p}s`); } catch (_) {}
        this._timer.start(p);
        try { this.menu.close(); } catch (_) {}
      });
      this._presetsSection.menu.addMenuItem(it);
    });
  }

  _formatPreset(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const mm = Math.floor((sec % 3600) / 60);
      const ss = sec % 60;
      return `${String(h)}h ${String(mm)}m ${String(ss)}s`;
    }
    return s ? `${m}m ${s}s` : `${m}m`;
  }

  _logDebug(msg) {
    // Only log when debug is enabled in settings
    try {
      let dbg = false;
      if (this._settings) dbg = this._settings.get_boolean('debug');
      if (dbg) console.debug(`[yrtimer] ${msg}`);
    } catch (_) {}
  }

  getTimer() { return this._timer; }
  restorePaused(remainingSec) { this._timer.setPaused(remainingSec); }
}

);
