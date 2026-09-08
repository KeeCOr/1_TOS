/* Game-audio runtime v3. Public API: window.GameAudioLayer.
 *
 * Settings model: two independent channel mutes (bgmMuted / sfxMuted) are
 * the source of truth. setMuted() only exists as a compatibility shim over
 * both channels for old callers - it is not itself a stored field.
 */
(function () {
  'use strict';
  var scriptUrl = (document.currentScript && document.currentScript.src) || window.location.href;
  var assetBase = new URL('generated/', scriptUrl);
  var storageKey = 'gameAudioLayer.settings.v3';
  var legacyStorageKey = 'gameAudioLayer.settings.v2';
  var files = {
    bgm: 'bgm_loop.ogg',
    ui_click: 'ui_click.ogg',
    action_primary: 'action_primary.ogg',
    danger_warning: 'danger_warning.ogg',
    transition: 'transition.ogg',
    result_success: 'result_success.ogg',
    result_failure: 'result_failure.ogg',
    recovery: 'recovery.ogg'
  };
  var duckCues = { danger_warning: 1, result_success: 1, result_failure: 1 };
  var defaultSettings = { bgmVolume: 0.28, sfxVolume: 0.70, bgmMuted: false, sfxMuted: false };
  var state = null;

  function toNumberOrNaN(v) { var n = Number(v); return isFinite(n) ? n : NaN; }
  function clamp01(v) { var n = toNumberOrNaN(v); return isNaN(n) ? NaN : Math.max(0, Math.min(1, n)); }
  function clampOr0(v) { var n = clamp01(v); return isNaN(n) ? 0 : n; }

  function sanitizeSettings(raw) {
    var out = {
      bgmVolume: defaultSettings.bgmVolume,
      sfxVolume: defaultSettings.sfxVolume,
      bgmMuted: defaultSettings.bgmMuted,
      sfxMuted: defaultSettings.sfxMuted
    };
    if (!raw || typeof raw !== 'object') return out;
    var bv = clamp01(raw.bgmVolume); if (!isNaN(bv)) out.bgmVolume = bv;
    var sv = clamp01(raw.sfxVolume); if (!isNaN(sv)) out.sfxVolume = sv;
    if (typeof raw.bgmMuted === 'boolean') out.bgmMuted = raw.bgmMuted;
    if (typeof raw.sfxMuted === 'boolean') out.sfxMuted = raw.sfxMuted;
    return out;
  }

  function readJson(key) {
    var raw = null;
    try { raw = localStorage.getItem(key); } catch (_) { raw = null; }
    if (raw === null) return { present: false, value: null };
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
    return { present: true, value: parsed };
  }

  function migrateLegacy() {
    var legacy = readJson(legacyStorageKey);
    var migrated = sanitizeSettings(null);
    if (!legacy.present || !legacy.value || typeof legacy.value !== 'object') return migrated;
    var bv = clamp01(legacy.value.bgmVolume); if (!isNaN(bv)) migrated.bgmVolume = bv;
    var sv = clamp01(legacy.value.sfxVolume); if (!isNaN(sv)) migrated.sfxVolume = sv;
    if (typeof legacy.value.muted === 'boolean') {
      migrated.bgmMuted = legacy.value.muted;
      migrated.sfxMuted = legacy.value.muted;
    }
    return migrated;
  }

  function loadSettings() {
    var current = readJson(storageKey);
    if (current.present) return sanitizeSettings(current.value);
    return migrateLegacy();
  }

  function saveSettings() {
    try { localStorage.setItem(storageKey, JSON.stringify(state.settings)); } catch (_) {}
  }

  function makeAudio(file, loop) {
    var node = document.createElement('audio');
    node.src = new URL(file, assetBase).href;
    node.preload = 'auto';
    node.loop = !!loop;
    node.addEventListener('error', function () {});
    return node;
  }

  function safePlay(node) {
    try {
      var p = node.play();
      if (p && p.catch) p.catch(function () {});
    } catch (_) {}
  }

  var duckGain = 0.562341;

  function applyBgmVolume() {
    if (!state) return;
    var vol = state.settings.bgmMuted ? 0 : clampOr0(state.settings.bgmVolume);
    if (state.duckCount > 0) vol *= duckGain;
    state.bgm.volume = vol;
    state.bgm.muted = state.settings.bgmMuted;
  }

  function removeDuckTimerId(id) {
    var arr = state && state.duckTimerIds;
    if (!arr) return;
    var i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
  }

  function clearAllDucking() {
    if (!state) return;
    for (var i = 0; i < state.duckTimerIds.length; i++) clearTimeout(state.duckTimerIds[i]);
    state.duckTimerIds.length = 0;
    state.duckCount = 0;
    applyBgmVolume();
  }

  function start() {
    if (!state) init();
    if (!state) return;
    state.started = true;
    applyBgmVolume();
    if (!document.hidden && !state.settings.bgmMuted) safePlay(state.bgm);
  }

  var MAX_ACTIVE_TOTAL = 12;
  var MAX_ACTIVE_PER_CUE = 3;

  function untrackEntry(entry) {
    var arr = state && state.active;
    if (!arr) return;
    var i = arr.indexOf(entry);
    if (i >= 0) arr.splice(i, 1);
  }

  function releaseDuckForEntry(entry) {
    if (!entry.duckStarted || entry.duckReleased) return;
    entry.duckReleased = true;
    if (entry.duckTimerId !== null) {
      clearTimeout(entry.duckTimerId);
      removeDuckTimerId(entry.duckTimerId);
      entry.duckTimerId = null;
    }
    if (!state) return;
    state.duckCount = Math.max(0, state.duckCount - 1);
    applyBgmVolume();
  }

  function cleanupEntry(entry) {
    if (!entry || entry.cleaned) return;
    entry.cleaned = true;
    untrackEntry(entry);
    try { entry.node.pause(); } catch (_) {}
    entry.node.removeEventListener('ended', entry.onEnded);
    entry.node.removeEventListener('error', entry.onEnded);
    entry.node.removeEventListener('abort', entry.onEnded);
    releaseDuckForEntry(entry);
  }

  function evictOldestForCue(cue) {
    var arr = state.active;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].cue === cue) { cleanupEntry(arr[i]); return true; }
    }
    return false;
  }

  function evictOldestOverall() {
    if (!state.active.length) return false;
    cleanupEntry(state.active[0]);
    return true;
  }

  function enforcePolyphonyCaps(cue) {
    var cueCount = 0;
    for (var i = 0; i < state.active.length; i++) {
      if (state.active[i].cue === cue) cueCount++;
    }
    while (cueCount >= MAX_ACTIVE_PER_CUE) {
      if (!evictOldestForCue(cue)) break;
      cueCount--;
    }
    while (state.active.length >= MAX_ACTIVE_TOTAL) {
      if (!evictOldestOverall()) break;
    }
  }

  function play(cue) {
    if (!state || typeof cue !== 'string' || cue === 'bgm') return;
    if (!Object.prototype.hasOwnProperty.call(files, cue) || state.settings.sfxMuted) return;
    enforcePolyphonyCaps(cue);
    var base = state.pool[cue] || (state.pool[cue] = makeAudio(files[cue], false));
    var node = base.cloneNode(true);
    node.volume = clampOr0(state.settings.sfxVolume);
    node.playbackRate = 0.97 + (state.sfxCounter % 7) * 0.01;
    state.sfxCounter++;
    var entry = {
      node: node,
      cue: cue,
      cleaned: false,
      duckStarted: false,
      duckReleased: false,
      duckTimerId: null,
      onEnded: null
    };
    entry.onEnded = function () { cleanupEntry(entry); };
    node.addEventListener('ended', entry.onEnded);
    node.addEventListener('error', entry.onEnded);
    node.addEventListener('abort', entry.onEnded);
    state.active.push(entry);
    var isDuck = !!duckCues[cue];
    var p = null;
    try { p = node.play(); } catch (_) { cleanupEntry(entry); return; }
    if (p && p.catch) p.catch(function () { cleanupEntry(entry); });
    if (isDuck) {
      entry.duckStarted = true;
      state.duckCount++;
      applyBgmVolume();
      var fallbackMs = (isFinite(node.duration) && node.duration > 0) ? node.duration * 1000 : 8000;
      entry.duckTimerId = setTimeout(function () {
        removeDuckTimerId(entry.duckTimerId);
        entry.duckTimerId = null;
        releaseDuckForEntry(entry);
      }, fallbackMs);
      state.duckTimerIds.push(entry.duckTimerId);
    }
  }

  function targetOf(e) {
    return e.target && e.target.closest ? e.target.closest('button,[role="button"],[data-audio-cue]') : null;
  }
  function cueOf(el) {
    var custom = el && el.getAttribute && el.getAttribute('data-audio-cue');
    return custom || 'ui_click';
  }
  function isControl(el) {
    return !!(el && el.closest && el.closest('[data-game-audio-control]'));
  }
  function onPointer(e) {
    if (!e.isTrusted) return;
    start();
    var el = targetOf(e);
    if (el && !isControl(el)) play(cueOf(el));
  }
  function onKey(e) {
    if (!e.isTrusted || (e.key !== 'Enter' && e.key !== ' ')) return;
    start();
    var el = targetOf(e);
    if (el && !isControl(el)) play(cueOf(el));
  }
  function onCustom(e) {
    var d = e && e.detail;
    var cue = typeof d === 'string' ? d : (d && d.cue);
    var userGesture = !!(d && typeof d === 'object' && d.userGesture === true);
    if (userGesture) start();
    play(cue);
  }
  function onVisibility() {
    if (!state || !state.started) return;
    if (document.hidden) state.bgm.pause();
    else if (!state.settings.bgmMuted) safePlay(state.bgm);
  }

  function muteButton(label, isMutedFn, toggleFn) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', label + ' \uc74c\uc18c\uac70 \uc804\ud658');
    btn.style.cssText = 'min-width:44px;height:44px;border:0;border-radius:8px;background:#343a46;color:#fff;cursor:pointer';
    btn.addEventListener('click', function () { toggleFn(!isMutedFn()); });
    return btn;
  }
  function slider(label, value, fn) {
    var l = document.createElement('label');
    l.style.cssText = 'display:flex;flex-direction:column;justify-content:center;min-height:44px';
    var s = document.createElement('span'); s.textContent = label;
    var input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = '1'; input.step = '.01'; input.value = value;
    input.setAttribute('aria-label', label + ' \ubcfc\ub968');
    input.style.cssText = 'width:80px;height:28px';
    input.addEventListener('input', function () { fn(input.value); });
    l.appendChild(s); l.appendChild(input);
    return { root: l, input: input };
  }
  function buildControls() {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-game-audio-control', '');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', '\uc624\ub514\uc624 \uc124\uc815');
    wrap.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;padding:8px;background:rgba(10,12,18,.88);border:1px solid rgba(255,255,255,.22);border-radius:10px;color:#fff;font:12px sans-serif';

    var bgmMuteBtn = muteButton('BGM', function () { return state.settings.bgmMuted; }, setBgmMuted);
    var bgmSlider = slider('BGM', state.settings.bgmVolume, setBgmVolume);
    var sfxMuteBtn = muteButton('SFX', function () { return state.settings.sfxMuted; }, setSfxMuted);
    var sfxSlider = slider('SFX', state.settings.sfxVolume, setSfxVolume);

    wrap.appendChild(bgmMuteBtn);
    wrap.appendChild(bgmSlider.root);
    wrap.appendChild(sfxMuteBtn);
    wrap.appendChild(sfxSlider.root);
    document.body.appendChild(wrap);

    state.ui = { root: wrap, bgmMute: bgmMuteBtn, sfxMute: sfxMuteBtn, bgm: bgmSlider.input, sfx: sfxSlider.input };
    updateControls();
  }
  function updateControls() {
    if (!state || !state.ui) return;
    state.ui.bgmMute.textContent = state.settings.bgmMuted ? 'BGM \ucf1c\uae30' : 'BGM \ub044\uae30';
    state.ui.bgmMute.setAttribute('aria-pressed', String(state.settings.bgmMuted));
    state.ui.sfxMute.textContent = state.settings.sfxMuted ? 'SFX \ucf1c\uae30' : 'SFX \ub044\uae30';
    state.ui.sfxMute.setAttribute('aria-pressed', String(state.settings.sfxMuted));
    state.ui.bgm.value = state.settings.bgmVolume;
    state.ui.sfx.value = state.settings.sfxVolume;
  }

  function setBgmVolume(v) {
    if (!state) return;
    state.settings.bgmVolume = clampOr0(v);
    applyBgmVolume(); saveSettings(); updateControls();
  }
  function setSfxVolume(v) {
    if (!state) return;
    state.settings.sfxVolume = clampOr0(v);
    saveSettings(); updateControls();
  }
  function setBgmMuted(v) {
    if (!state) return;
    state.settings.bgmMuted = !!v;
    applyBgmVolume();
    if (state.settings.bgmMuted) state.bgm.pause();
    else if (state.started && !document.hidden) safePlay(state.bgm);
    saveSettings(); updateControls();
  }
  function setSfxMuted(v) {
    if (!state) return;
    state.settings.sfxMuted = !!v;
    if (state.settings.sfxMuted) {
      var toClean = state.active.slice();
      for (var i = 0; i < toClean.length; i++) cleanupEntry(toClean[i]);
      clearAllDucking();
    }
    saveSettings(); updateControls();
  }
  function setMuted(v) {
    if (!state) return;
    var muted = !!v;
    state.settings.bgmMuted = muted;
    state.settings.sfxMuted = muted;
    applyBgmVolume();
    if (muted) {
      state.bgm.pause();
      var toClean = state.active.slice();
      for (var i = 0; i < toClean.length; i++) cleanupEntry(toClean[i]);
      clearAllDucking();
    } else if (state.started && !document.hidden) {
      safePlay(state.bgm);
    }
    saveSettings(); updateControls();
  }

  function getState() {
    if (!state) return null;
    return {
      started: state.started,
      bgmMuted: state.settings.bgmMuted,
      sfxMuted: state.settings.sfxMuted,
      bgmVolume: state.settings.bgmVolume,
      sfxVolume: state.settings.sfxVolume
    };
  }

  function destroy() {
    if (!state) return;
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('game-audio', onCustom);
    document.removeEventListener('visibilitychange', onVisibility);
    var toClean = state.active.slice();
    for (var i = 0; i < toClean.length; i++) cleanupEntry(toClean[i]);
    clearAllDucking();
    state.bgm.pause();
    if (state.ui && state.ui.root && state.ui.root.parentNode) state.ui.root.parentNode.removeChild(state.ui.root);
    state = null;
  }

  function init() {
    if (state || !document.body) return;
    state = {
      settings: loadSettings(),
      started: false,
      bgm: makeAudio(files.bgm, true),
      pool: {},
      active: [],
      ui: null,
      duckCount: 0,
      duckTimerIds: [],
      sfxCounter: 0
    };
    applyBgmVolume();
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('game-audio', onCustom);
    document.addEventListener('visibilitychange', onVisibility);
    buildControls();
  }

  window.GameAudioLayer = {
    init: init,
    start: start,
    play: play,
    setBgmVolume: setBgmVolume,
    setSfxVolume: setSfxVolume,
    setBgmMuted: setBgmMuted,
    setSfxMuted: setSfxMuted,
    setMuted: setMuted,
    getState: getState,
    destroy: destroy
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

