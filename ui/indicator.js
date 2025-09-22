// ESM port — ui/indicator.js (GNOME Shell 45+)
// Converted imports to ESM. Logic remains equivalent to legacy version.

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import Gettext from 'gettext';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// No ExtensionUtils import: compute base path from import.meta

// Internal modules (to be ported to ESM as well)
import { Timer, TimerState } from '../core/timer.js';
import { Notifier } from '../core/notifier.js';
import * as Settings from '../core/settings.js';

function _getRootPathFromMeta() {
  try {
    const file = Gio.File.new_for_uri(import.meta.url); // ui/indicator.js
    const dir = file.get_parent(); // ui/
    const root = dir.get_parent(); // extension root
    return root.get_path();
  } catch (_) { return ''; }
}
const Me = { path: _getRootPathFromMeta(), metadata: { 'gettext-domain': 'yrtimer' } };

let _ = (s) => s;
try { _ = Gettext.domain(Me.metadata['gettext-domain'] || 'yrtimer').gettext; } catch (_) {}

try { log('[yrtimer] indicator.js loaded (ESM)'); } catch (_) {}

export const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
  _init() {
    try { log('[yrtimer] Indicator: before super._init'); } catch (_) {}
    super._init(0.0, 'yrtimer');
    try { log('[yrtimer] Indicator: after super._init'); } catch (_) {}
    this._baseDirPath = Me.path;
    try { log('[yrtimer] Indicator: constructor start'); } catch (_) {}

    try { this._applyLocaleOverride(); } catch (_) {}

    this._icon = new St.Icon({ style_class: 'system-status-icon', y_align: Clutter.ActorAlign.CENTER });
    try {
      const gicon = Gio.icon_new_for_string(`${Me.path}/icons/yrtimer-symbolic.svg`);
      this._icon.gicon = gicon;
    } catch (_) {
      this._icon.icon_name = 'preferences-system-time-symbolic';
    }


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
      ct.ellipsize = Pango.EllipsizeMode.NONE;
      ct.set_single_line_mode(true);
      ct.set_line_wrap(false);
      if (ct.set_max_width_chars) ct.set_max_width_chars(-1);
    } catch (_) {}

    this._labelMaxWidth = 0;
    this.visible = true;
    this.reactive = true;
    this._box.x_expand = true;
    try {
      const tip = _('Left: start/pause, Middle: reset, Shift+Left: last preset, Ctrl+Left: Preferences');
      if (this._icon.set_tooltip_text) this._icon.set_tooltip_text(tip);
      if (this._label.set_tooltip_text) this._label.set_tooltip_text(tip);
      if (this.set_tooltip_text) this.set_tooltip_text(_('yrtimer indicator'));
    } catch (_) {}
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

    this._icon.set_accessible_name(_('Timer icon'));
    this._label.set_accessible_name(_('Remaining time'));
    this.set_accessible_name(_('yrtimer indicator'));

    this._timer = new Timer((msg) => this._logDebug(msg));
    this._notifier = new Notifier(this._baseDirPath);
    this._settings = null;
    try {
      this._settings = Settings.getSettings ? Settings.getSettings() : null;
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

    if (this._settings) {
      this._settings.connect('changed::presets', () => this._rebuildPresets());
      this._settings.connect('changed::panel-style', () => this._applyPanelStyle());
      this._settings.connect('changed::display-format', () => this._updateUI());
      this._settings.connect('changed::override-locale', () => {
        try { this.menu.close(); } catch (_) {}
        try { this._applyLocaleOverride(); } catch (_) {}
        try {
          this.menu.removeAll();
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
            try { this._buildMenu(); this._updateUI(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
          });
        } catch (_) {}
      });
      this._settings.connect('changed::position-in-panel', () => {
        try { this._repositionInPanel(); } catch (_) {}
      });
    }

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

    try {
      this.connect('button-press-event', (actor, event) => {
        const btn = event.get_button();
        try { log(`[yrtimer] panel click: button=${btn} state=${event.get_state && event.get_state()}`); } catch (_) {}
        if (btn === 1) {
          try {
            const st = event.get_state ? event.get_state() : 0;
            const CTRL = Clutter.ModifierType.CONTROL_MASK;
            const SHIFT = Clutter.ModifierType.SHIFT_MASK;
            if (st & CTRL) {
              try { Gio.Subprocess.new(['gnome-extensions', 'prefs', 'yrtimer@yrelay.fr'], Gio.SubprocessFlags.NONE).init(null); } catch (_) {}
              return Clutter.EVENT_STOP;
            }
            if (st & SHIFT) {
              try { this._startLastPreset(); } catch (_) {}
              return Clutter.EVENT_STOP;
            }
          } catch (_) {}
          if (this._timer.remaining > 0) {
            if (this._timer.state === 'RUNNING') this._timer.pause();
            else this._timer.start();
          } else {
            this.menu.toggle();
          }
          return Clutter.EVENT_STOP;
        }
        if (btn === 2) {
          this._timer.reset();
          return Clutter.EVENT_STOP;
        }
        if (btn === 3) { try { this._openPrefsSafe(); } catch (_) {} return Clutter.EVENT_STOP; }
        return Clutter.EVENT_PROPAGATE;
      });

      const onInnerClick = (actor, event) => {
        const btn = event.get_button();
        try { log(`[yrtimer] inner click on ${actor && actor.toString ? actor.toString() : 'actor'} btn=${btn}`); } catch (_) {}
        if (btn === 1) { this.menu.toggle(); return Clutter.EVENT_STOP; }
        if (btn === 2) { this._timer.reset(); return Clutter.EVENT_STOP; }
        if (btn === 3) { try { this._openPrefsSafe(); } catch (_) {} return Clutter.EVENT_STOP; }
        return Clutter.EVENT_PROPAGATE;
      };
      try { this._box.reactive = true; this._box.connect('button-press-event', onInnerClick); } catch (_) {}
      try { this._icon.reactive = true; this._icon.connect('button-press-event', onInnerClick); } catch (_) {}
      try { this._label.reactive = true; this._label.connect('button-press-event', onInnerClick); } catch (_) {}
    } catch (_) {}
  }

  _openPrefsSafe() {
    if (this._openingPrefs) return;
    this._openingPrefs = true;
    try { if (this.menu && this.menu.close) this.menu.close(); } catch (_) {}
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      try { GLib.spawn_command_line_async('gnome-extensions prefs yrtimer@yrelay.fr'); } catch (_) {}
      this._openingPrefs = false;
      return GLib.SOURCE_REMOVE;
    });
  }

  _applyLocaleOverride() {
    try {
      const domain = Me.metadata['gettext-domain'] || 'yrtimer';
      let loc = '';
      try { const s = Settings.getSettings ? Settings.getSettings() : null; loc = s ? (s.get_string('override-locale') || '') : ''; } catch (_) { loc = ''; }
      const prevLANGUAGE = GLib.getenv('LANGUAGE') || '';
      const prevLCMSG = GLib.getenv('LC_MESSAGES') || '';
      const prevLANG = GLib.getenv('LANG') || '';
      try {
        if (loc) {
          try { GLib.setenv('LANGUAGE', loc, true); } catch (_) {}
          try { GLib.setenv('LC_MESSAGES', loc, true); } catch (_) {}
          try { GLib.setenv('LANG', loc, true); } catch (_) {}
        }
        try {
          const localePath = `${Me.path}/locale`;
          if (Gettext.bindtextdomain) Gettext.bindtextdomain(domain, localePath);
          if (Gettext.bind_textdomain_codeset) Gettext.bind_textdomain_codeset(domain, 'UTF-8');
        } catch (_) {}
        try { _ = Gettext.domain(domain).gettext; } catch (_) {}
      } finally {
        try { GLib.setenv('LANGUAGE', prevLANGUAGE, true); } catch (_) {}
        try { GLib.setenv('LC_MESSAGES', prevLCMSG, true); } catch (_) {}
        try { GLib.setenv('LANG', prevLANG, true); } catch (_) {}
      }
      const locForWrap = loc; const domForWrap = domain;
      _ = (s) => {
        const prevA = GLib.getenv('LANGUAGE') || '';
        const prevB = GLib.getenv('LC_MESSAGES') || '';
        const prevC = GLib.getenv('LANG') || '';
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
      try {
        const children = this._pillsBox.get_children();
        children.forEach(c => { try { this._pillsBox.remove_child(c); } catch (_) {} });
      } catch (_) {}

      let quickPresets = [60, 300, 1500];
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
      if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    } catch (_) {
      return this._timer.formatRemaining();
    }
  }

  _handleElapsed() {
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
      let [alignment, gravity] = this._computeAlignment();
      Main.panel.addToStatusArea('yrtimer-indicator', this, gravity, alignment);
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
      const idx = gravity;
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
          case 0: alignment = 'left'; gravity = -1; break;
          case 1: alignment = 'center'; gravity = -1; break;
          case 2: alignment = 'right'; gravity = 0; break;
          case 3: alignment = 'left'; gravity = 0; break;
          case 4: alignment = 'right'; gravity = -1; break;
        }
      }
    } catch (_) {}
    return [alignment, gravity];
  }

  _updateUI() {
    const t = this._formatRemainingBySetting();
    this._label.text = t;
    this._logDebug(`[yrtimer] _updateUI -> ${t}`);
    this.remove_style_class_name('state-idle');
    this.remove_style_class_name('state-running');
    this.remove_style_class_name('state-paused');
    const st = this._timer.state;
    if (st === 'RUNNING') this.add_style_class_name('state-running');
    else if (st === 'PAUSED') this.add_style_class_name('state-paused');
    else this.add_style_class_name('state-idle');
    if (this._label && this._icon) {
      try {
        const style = this._settings ? this._settings.get_string('panel-style') : 'both';
        if (style !== 'icon') this._label.visible = true;
      } catch (_) { this._label.visible = true; }
    }
    try { this._ensureLabelWidth(); } catch (_) {}
  }

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

  _ensureLabelWidth() {
    try {
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
        } else {
          maxText = remaining >= 3600 ? '88:88:88' : '88:88';
        }
      } catch (_) {}

      const tmp = new St.Label({ text: maxText, style_class: 'yrtimer-label' });
      try {
        global.stage.add_child(tmp);
        const width = tmp.get_clutter_text().width + 0;
        const w = Math.max(48, width);
        if (this._label) {
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
        const d1 = _('Presets');
        const d2 = _('Preferences');
        log(`[yrtimer] _buildMenu i18n check -> Presets='${d1}' Preferences='${d2}'`);
      } catch (_) {}
      const item = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      const box = new St.BoxLayout({ vertical: false });

      this._entry = new St.Entry({
        style_class: 'yrtimer-entry',
        can_focus: true,
        x_expand: true,
        hint_text: _('Enter duration (e.g., 1m 12s)'),
      });
      this._entry.set_accessible_name(_('Duration input'));
      try { this._entry.connect('activate', () => { try { log('[yrtimer] entry.activate'); } catch (_) {} this._startFromEntry(); }); } catch (_) {}
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

      const pillsRow = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      this._pillsBox = new St.BoxLayout({ vertical: false });
      pillsRow.add_child(this._pillsBox);
      this.menu.addMenuItem(pillsRow);
      this._rebuildQuickPills();
      try {
        if (this._settings && !this._presetsChangedId)
          this._presetsChangedId = this._settings.connect('changed::presets', () => this._rebuildQuickPills());
      } catch (_) {}
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
              try { this._applyLocaleOverride(); } catch (_) {}
              try {
                this.menu.removeAll();
                this._buildMenu();
                this._updateUI();
              } catch (_) {}
              try { this._rebuildQuickPills(); } catch (_) {}
              try {
                if (this._entry && this._entry.grab_key_focus) {
                  this._entry.grab_key_focus();
                } else if (global && global.stage && global.stage.set_key_focus) {
                  global.stage.set_key_focus(this._entry);
                }
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

      const btnRow = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      const rowBox = new St.BoxLayout({ vertical: false });
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

      this._presetsSection = new PopupMenu.PopupSubMenuMenuItem(_('Presets'), true);
      try { if (this._presetsSection && this._presetsSection.label) this._presetsSection.label.text = _('Presets'); } catch (_) {}
      this.menu.addMenuItem(this._presetsSection);
      this._rebuildPresets();

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      const prefsItem = new PopupMenu.PopupImageMenuItem(_('Preferences'), 'preferences-system-symbolic');
      try { if (prefsItem && prefsItem.label) prefsItem.label.text = _('Preferences'); } catch (_) {}
      prefsItem.connect('activate', () => {
        try { this._openPrefsSafe(); } catch (_) {}
      });
      this.menu.addMenuItem(prefsItem);

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
