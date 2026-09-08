/* Original generated-audio runtime. Public API: window.GameAudioLayer. */
(function () {
  'use strict';
  var scriptUrl = (document.currentScript && document.currentScript.src) || window.location.href;
  var assetBase = new URL('generated/', scriptUrl);
  var storageKey = 'gameAudioLayer.settings.v2';
  var files = {
    bgm: 'bgm_loop.ogg', ui_click: 'ui_click.wav', action_primary: 'action_primary.wav',
    danger_warning: 'danger_warning.wav', transition: 'transition.wav',
    result_success: 'result_success.wav', result_failure: 'result_failure.wav'
  };
  var keywords = [
    ['danger_warning', ['위험', '경고', 'danger', 'warning', 'critical']],
    ['transition', ['전환', '이동 중', 'loading', 'transition', 'stage']],
    ['result_success', ['성공', '승리', 'success', 'victory', 'clear']],
    ['result_failure', ['실패', '패배', 'failure', 'defeat', 'game over']]
  ];
  var state = null;
  function clamp(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }
  function loadSettings() {
    try { var raw = localStorage.getItem(storageKey); if (raw) return JSON.parse(raw); } catch (_) {}
    return { bgmVolume: 0.28, sfxVolume: 0.70, muted: false };
  }
  function saveSettings() {
    try { localStorage.setItem(storageKey, JSON.stringify(state.settings)); } catch (_) {}
  }
  function makeAudio(file, loop) {
    var node = document.createElement('audio');
    node.src = new URL(file, assetBase).href; node.preload = 'auto'; node.loop = !!loop;
    node.addEventListener('error', function () {}); return node;
  }
  function safePlay(node) {
    try { var p = node.play(); if (p && p.catch) p.catch(function () {}); } catch (_) {}
  }
  function applyBgmVolume() {
    if (!state) return;
    state.bgm.volume = state.settings.muted ? 0 : clamp(state.settings.bgmVolume);
    state.bgm.muted = state.settings.muted;
  }
  var duckCues = { danger_warning: 1, result_success: 1, result_failure: 1 };
  function duckBgm() {
    if (!state) return;
    clearTimeout(state.duckTimer);
    state.bgm.volume = state.settings.muted ? 0 : clamp(state.settings.bgmVolume) * 0.5;
    state.duckTimer = setTimeout(function () { state.duckTimer = null; applyBgmVolume(); }, 700);
  }
  function start() {
    if (!state) init();
    if (!state) return;
    state.started = true; applyBgmVolume();
    if (!document.hidden && !state.settings.muted) safePlay(state.bgm);
  }
  function play(cue) {
    if (!state || !files[cue] || cue === 'bgm' || state.settings.muted) return;
    var base = state.pool[cue] || (state.pool[cue] = makeAudio(files[cue], false));
    var node = base.cloneNode(true); node.volume = clamp(state.settings.sfxVolume);
    node.playbackRate = 0.97 + (state.sfxCounter % 7) * 0.01; state.sfxCounter++;
    state.active.push(node); safePlay(node);
    node.addEventListener('ended', function () { var i = state.active.indexOf(node); if (i >= 0) state.active.splice(i, 1); });
    if (duckCues[cue]) duckBgm();
  }
  function targetOf(e) { return e.target && e.target.closest ? e.target.closest('button,[role="button"],[data-audio-cue]') : null; }
  function cueOf(el) { return el && el.getAttribute('data-audio-cue') || 'ui_click'; }
  function onPointer(e) { if (!e.isTrusted) return; start(); var el = targetOf(e); if (el && !el.closest('[data-game-audio-control]')) play(cueOf(el)); }
  function onKey(e) { if (!e.isTrusted || (e.key !== 'Enter' && e.key !== ' ')) return; start(); var el = targetOf(e); if (el && !el.closest('[data-game-audio-control]')) play(cueOf(el)); }
  function onCustom(e) { start(); var d = e.detail; play(typeof d === 'string' ? d : d && d.cue); }
  var textTimer = 0, pendingCue = '';
  function scan(text) {
    if (!state || !state.started || !text) return;
    var lower = text.toLowerCase();
    for (var i = 0; i < keywords.length; i++) for (var j = 0; j < keywords[i][1].length; j++) {
      if (lower.indexOf(keywords[i][1][j]) >= 0) {
        pendingCue = keywords[i][0]; clearTimeout(textTimer);
        textTimer = setTimeout(function () { if (pendingCue) play(pendingCue); pendingCue = ''; }, 260); return;
      }
    }
  }
  function onMutations(list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i]; if (m.target && m.target.closest && m.target.closest('[data-game-audio-control]')) continue;
      if (m.type === 'characterData') scan(m.target.data);
      else for (var n = 0; n < m.addedNodes.length; n++) {
        var node = m.addedNodes[n]; if (node.nodeType === 3) scan(node.data); else if (node.nodeType === 1 && !node.closest('[data-game-audio-control]')) scan(node.textContent);
      }
    }
  }
  function buildControls() {
    var wrap = document.createElement('div'); wrap.setAttribute('data-game-audio-control', '');
    wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', '오디오 설정');
    wrap.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;padding:8px;background:rgba(10,12,18,.88);border:1px solid rgba(255,255,255,.22);border-radius:10px;color:#fff;font:12px sans-serif';
    var mute = document.createElement('button'); mute.type = 'button'; mute.style.cssText = 'min-width:44px;height:44px;border:0;border-radius:8px;background:#343a46;color:#fff;cursor:pointer';
    function slider(label, value, fn) {
      var l = document.createElement('label'); l.style.cssText = 'display:flex;flex-direction:column;justify-content:center;min-height:44px';
      var s = document.createElement('span'); s.textContent = label; var input = document.createElement('input');
      input.type = 'range'; input.min = '0'; input.max = '1'; input.step = '.01'; input.value = value; input.setAttribute('aria-label', label + ' 볼륨'); input.style.cssText = 'width:80px;height:28px';
      input.addEventListener('input', function () { fn(input.value); }); l.appendChild(s); l.appendChild(input); return { root: l, input: input };
    }
    var bgm = slider('BGM', state.settings.bgmVolume, setBgmVolume), sfx = slider('SFX', state.settings.sfxVolume, setSfxVolume);
    mute.addEventListener('click', function () { setMuted(!state.settings.muted); });
    wrap.appendChild(mute); wrap.appendChild(bgm.root); wrap.appendChild(sfx.root); document.body.appendChild(wrap);
    state.ui = { root: wrap, mute: mute, bgm: bgm.input, sfx: sfx.input }; updateControls();
  }
  function updateControls() {
    if (!state || !state.ui) return; state.ui.mute.textContent = state.settings.muted ? '소리 켜기' : '음소거';
    state.ui.mute.setAttribute('aria-pressed', String(state.settings.muted)); state.ui.bgm.value = state.settings.bgmVolume; state.ui.sfx.value = state.settings.sfxVolume;
  }
  function setBgmVolume(v) { if (!state) return; state.settings.bgmVolume = clamp(v); applyBgmVolume(); saveSettings(); updateControls(); }
  function setSfxVolume(v) { if (!state) return; state.settings.sfxVolume = clamp(v); saveSettings(); updateControls(); }
  function setMuted(v) { if (!state) return; state.settings.muted = !!v; applyBgmVolume(); if (state.settings.muted) state.bgm.pause(); else if (state.started) safePlay(state.bgm); saveSettings(); updateControls(); }
  function onVisibility() { if (!state || !state.started) return; if (document.hidden) state.bgm.pause(); else if (!state.settings.muted) safePlay(state.bgm); }
  function getState() { return state ? { started: state.started, muted: state.settings.muted, bgmVolume: state.settings.bgmVolume, sfxVolume: state.settings.sfxVolume } : null; }
  function destroy() {
    if (!state) return; document.removeEventListener('pointerdown', onPointer, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('game-audio', onCustom); document.removeEventListener('visibilitychange', onVisibility);
    if (state.observer) state.observer.disconnect(); clearTimeout(state.duckTimer); state.bgm.pause(); for (var i = 0; i < state.active.length; i++) state.active[i].pause(); if (state.ui) state.ui.root.remove(); state = null;
  }
  function init() {
    if (state || !document.body) return; state = { settings: loadSettings(), started: false, bgm: makeAudio(files.bgm, true), pool: {}, active: [], observer: null, ui: null, duckTimer: null, sfxCounter: 0 };
    applyBgmVolume(); document.addEventListener('pointerdown', onPointer, true); document.addEventListener('keydown', onKey, true); window.addEventListener('game-audio', onCustom); document.addEventListener('visibilitychange', onVisibility);
    state.observer = new MutationObserver(onMutations); state.observer.observe(document.body, { subtree: true, childList: true, characterData: true }); buildControls();
  }
  window.GameAudioLayer = { init: init, start: start, play: play, setBgmVolume: setBgmVolume, setSfxVolume: setSfxVolume, setMuted: setMuted, getState: getState, destroy: destroy };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
