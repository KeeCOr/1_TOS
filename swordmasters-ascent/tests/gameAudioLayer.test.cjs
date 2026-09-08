'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CANDIDATES = [
  '../public/assets/audio/game-audio-layer.js',
  '../src/assets/audio/game-audio-layer.js',
  '../assets/audio/game-audio-layer.js',
  '../dist/assets/audio/game-audio-layer.js',
  './game-audio-layer.v3.js'
];

function resolveSrcPath() {
  for (var i = 0; i < CANDIDATES.length; i++) {
    var candidate = path.join(__dirname, CANDIDATES[i]);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'game-audio-layer.v3.test.cjs: could not find a runtime to test. Looked for: ' +
    CANDIDATES.join(', ')
  );
}

const SRC_PATH = resolveSrcPath();
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

// ---------------------------------------------------------------------------
// Minimal fake DOM primitives, just enough to run the v3 IIFE inside vm.
// ---------------------------------------------------------------------------

function matchesSingle(node, sel) {
  sel = sel.trim();
  if (sel === 'button') return node.tagName === 'BUTTON';
  var m = sel.match(/^\[([a-zA-Z0-9-]+)(?:="([^"]*)")?\]$/);
  if (m) {
    var attr = m[1];
    var val = m[2];
    var has = node.getAttribute(attr) !== null;
    if (val === undefined) return has;
    return has && node.getAttribute(attr) === val;
  }
  return false;
}

function matchesSelector(node, selector) {
  return selector.split(',').some(function (part) { return matchesSingle(node, part); });
}

class ListenerHost {
  constructor() { this.listeners = {}; }
  add(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  remove(type, fn) {
    var arr = this.listeners[type];
    if (!arr) return;
    var i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  dispatch(evt) {
    var arr = (this.listeners[evt.type] || []).slice();
    arr.forEach(function (fn) { fn(evt); });
  }
}

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.textContent = '';
    this._listeners = new ListenerHost();
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    var i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  addEventListener(type, fn) { this._listeners.add(type, fn); }
  removeEventListener(type, fn) { this._listeners.remove(type, fn); }
  dispatchEvent(evt) { evt.target = evt.target || this; this._listeners.dispatch(evt); }
  closest(selector) {
    var node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
}

class FakeAudio extends FakeNode {
  constructor(cfg) {
    super('audio');
    this._cfg = cfg;
    this.src = '';
    this.preload = '';
    this.loop = false;
    this.volume = 1;
    this.muted = false;
    this.duration = NaN;
    this.playbackRate = 1;
    this.paused = true;
    if (cfg) cfg.registry.push(this);
  }
  play() {
    this.paused = false;
    if (this._cfg) this._cfg.playCalls.push({ node: this, src: this.src });
    var behavior = this._cfg && this._cfg.playBehavior;
    if (typeof behavior === 'function') return behavior(this);
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  cloneNode() {
    var c = new FakeAudio(this._cfg);
    c.src = this.src;
    c.preload = this.preload;
    c.loop = this.loop;
    c.volume = this.volume;
    c.duration = this.duration;
    c.playbackRate = this.playbackRate;
    return c;
  }
}

function makeLocalStorage(initial) {
  var store = new Map(Object.entries(initial || {}));
  return {
    getItem: function (key) { return store.has(key) ? store.get(key) : null; },
    setItem: function (key, value) { store.set(key, String(value)); },
    removeItem: function (key) { store.delete(key); }
  };
}

function makeTimers() {
  var idCounter = 1;
  var pending = new Map();
  return {
    setTimeout: function (fn, ms) {
      var id = idCounter++;
      pending.set(id, { fn: fn, ms: ms });
      return id;
    },
    clearTimeout: function (id) { pending.delete(id); },
    pendingCount: function () { return pending.size; }
  };
}

function createEnv(opts) {
  opts = opts || {};
  var timers = makeTimers();
  var localStorage = makeLocalStorage(opts.localStorageData);
  var audioConfig = { playBehavior: null, registry: [], playCalls: [] };
  var documentListeners = new ListenerHost();
  var windowListeners = new ListenerHost();
  var body = new FakeNode('body');

  var document = {
    currentScript: { src: 'http://localhost/app.js' },
    readyState: 'complete',
    hidden: !!opts.hidden,
    body: body,
    createElement: function (tag) {
      return tag === 'audio' ? new FakeAudio(audioConfig) : new FakeNode(tag);
    },
    addEventListener: function (t, f) { documentListeners.add(t, f); },
    removeEventListener: function (t, f) { documentListeners.remove(t, f); },
    dispatchEvent: function (e) { documentListeners.dispatch(e); }
  };

  var window = {
    location: { href: 'http://localhost/app.js' },
    addEventListener: function (t, f) { windowListeners.add(t, f); },
    removeEventListener: function (t, f) { windowListeners.remove(t, f); },
    dispatchEvent: function (e) { windowListeners.dispatch(e); }
  };

  var sandbox = {
    window: window,
    document: document,
    localStorage: localStorage,
    URL: URL,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: SRC_PATH });

  return {
    window: window,
    document: document,
    localStorage: localStorage,
    timers: timers,
    audioConfig: audioConfig,
    body: body,
    GameAudioLayer: window.GameAudioLayer,
    findBgm: function () { return audioConfig.registry.find(function (n) { return n.loop === true; }); },
    playCallsFor: function (match) {
      return audioConfig.playCalls.filter(function (c) { return c.src.indexOf(match) !== -1; });
    },
    lastCreated: function () { return audioConfig.registry[audioConfig.registry.length - 1]; },
    makeButton: function (cue) {
      var btn = new FakeNode('button');
      if (cue) btn.setAttribute('data-audio-cue', cue);
      return btn;
    },
    firePointer: function (target, trusted) {
      document.dispatchEvent({ type: 'pointerdown', isTrusted: trusted !== false, target: target });
    },
    fireCustomAudio: function (detail) {
      window.dispatchEvent({ type: 'game-audio', detail: detail });
    },
    fireVisibility: function () {
      document.dispatchEvent({ type: 'visibilitychange' });
    }
  };
}

function flushMicrotasks() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('malformed JSON and wrong types/ranges fall back to safe defaults', function () {
  var cases = [
    { raw: 'not json at all' },
    { raw: JSON.stringify({ bgmVolume: 'loud', sfxVolume: 'quiet', bgmMuted: 1, sfxMuted: 'yes' }) },
    { raw: JSON.stringify({ bgmVolume: 5, sfxVolume: -3 }), exact: { bgmVolume: 1, sfxVolume: 0 } },
    { raw: JSON.stringify('just a string') },
    { raw: JSON.stringify([1, 2, 3]) },
    { raw: JSON.stringify(42) }
  ];
  cases.forEach(function (c) {
    var env = createEnv({ localStorageData: { 'gameAudioLayer.settings.v3': c.raw } });
    var s = env.GameAudioLayer.getState();
    assert.ok(typeof s.bgmVolume === 'number' && s.bgmVolume >= 0 && s.bgmVolume <= 1, 'bgmVolume in range for ' + c.raw);
    assert.ok(typeof s.sfxVolume === 'number' && s.sfxVolume >= 0 && s.sfxVolume <= 1, 'sfxVolume in range for ' + c.raw);
    assert.strictEqual(typeof s.bgmMuted, 'boolean');
    assert.strictEqual(typeof s.sfxMuted, 'boolean');
    if (c.exact) {
      assert.strictEqual(s.bgmVolume, c.exact.bgmVolume);
      assert.strictEqual(s.sfxVolume, c.exact.sfxVolume);
    } else {
      assert.strictEqual(s.bgmVolume, 0.28);
      assert.strictEqual(s.sfxVolume, 0.70);
      assert.strictEqual(s.bgmMuted, false);
      assert.strictEqual(s.sfxMuted, false);
    }
    env.GameAudioLayer.destroy();
  });
});

test('v2 single muted flag migrates into both bgmMuted and sfxMuted', function () {
  var env = createEnv({
    localStorageData: {
      'gameAudioLayer.settings.v2': JSON.stringify({ bgmVolume: 0.5, sfxVolume: 0.9, muted: true })
    }
  });
  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, true);
  assert.strictEqual(s.sfxMuted, true);
  assert.strictEqual(s.bgmVolume, 0.5);
  assert.strictEqual(s.sfxVolume, 0.9);
  env.GameAudioLayer.destroy();
});

test('separate bgm/sfx mute APIs and the setMuted compatibility shim', function () {
  var env = createEnv();

  env.GameAudioLayer.setBgmMuted(true);
  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, true);
  assert.strictEqual(s.sfxMuted, false);

  env.GameAudioLayer.setSfxMuted(true);
  s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, true);
  assert.strictEqual(s.sfxMuted, true);

  // sfx muted: further cue playback must be suppressed
  env.GameAudioLayer.play('ui_click');
  assert.strictEqual(env.playCallsFor('ui_click.ogg').length, 0);

  env.GameAudioLayer.setBgmMuted(false);
  env.GameAudioLayer.setSfxMuted(false);
  s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, false);
  assert.strictEqual(s.sfxMuted, false);

  env.GameAudioLayer.setMuted(true);
  s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, true);
  assert.strictEqual(s.sfxMuted, true);

  env.GameAudioLayer.setMuted(false);
  s = env.GameAudioLayer.getState();
  assert.strictEqual(s.bgmMuted, false);
  assert.strictEqual(s.sfxMuted, false);

  env.GameAudioLayer.destroy();
});

test('trusted pointer on a cue button starts bgm once and plays exactly one cue', function () {
  var env = createEnv();
  var btn = env.makeButton('action_primary');
  env.firePointer(btn, true);

  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.started, true);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 1);
  assert.strictEqual(env.playCallsFor('action_primary.ogg').length, 1);
  assert.strictEqual(env.playCallsFor('ui_click.ogg').length, 0, 'data-audio-cue must not also fire the default ui_click cue');

  env.GameAudioLayer.destroy();
});

test('untrusted pointer interaction is ignored entirely', function () {
  var env = createEnv();
  var btn = env.makeButton();
  env.firePointer(btn, false);

  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.started, false);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 0);
  assert.strictEqual(env.playCallsFor('ui_click.ogg').length, 0);

  env.GameAudioLayer.destroy();
});

test('custom game-audio event only starts bgm when detail.userGesture is true', function () {
  var env = createEnv();

  env.fireCustomAudio({ cue: 'ui_click' });
  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.started, false);
  assert.strictEqual(env.playCallsFor('ui_click.ogg').length, 1);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 0);

  env.fireCustomAudio({ cue: 'ui_click', userGesture: true });
  s = env.GameAudioLayer.getState();
  assert.strictEqual(s.started, true);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 1);
  assert.strictEqual(env.playCallsFor('ui_click.ogg').length, 2);

  env.GameAudioLayer.destroy();
});

test('hidden document never starts or resumes bgm playback', function () {
  var env = createEnv({ hidden: true });

  env.GameAudioLayer.start();
  var s = env.GameAudioLayer.getState();
  assert.strictEqual(s.started, true);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 0);

  env.fireVisibility();
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 0);

  env.GameAudioLayer.setBgmMuted(true);
  env.GameAudioLayer.setBgmMuted(false);
  assert.strictEqual(env.playCallsFor('bgm_loop.ogg').length, 0, 'unmuting while hidden must not resume bgm');

  env.GameAudioLayer.destroy();
});

test('danger/result cues duck bgm volume and recover on end; normal cues do not duck', function () {
  var env = createEnv();
  env.GameAudioLayer.start();
  var bgm = env.findBgm();
  var normalVolume = bgm.volume;

  env.GameAudioLayer.play('ui_click');
  assert.strictEqual(bgm.volume, normalVolume, 'normal cue must not duck bgm');

  env.GameAudioLayer.play('danger_warning');
  assert.ok(bgm.volume < normalVolume, 'duck cue must lower bgm volume');
  var clone1 = env.lastCreated();
  clone1.dispatchEvent({ type: 'ended' });
  assert.strictEqual(bgm.volume, normalVolume, 'bgm volume recovers after duck cue ends');

  env.GameAudioLayer.play('result_success');
  assert.ok(bgm.volume < normalVolume);
  var clone2 = env.lastCreated();
  clone2.dispatchEvent({ type: 'error' });
  assert.strictEqual(bgm.volume, normalVolume, 'bgm volume recovers after duck cue errors');

  env.GameAudioLayer.play('result_failure');
  assert.ok(bgm.volume < normalVolume);
  var clone3 = env.lastCreated();
  clone3.dispatchEvent({ type: 'abort' });
  assert.strictEqual(bgm.volume, normalVolume, 'bgm volume recovers after duck cue aborts');

  env.GameAudioLayer.destroy();
});

test('rejected play and duplicate ended/error/abort events safely remove clones without double release', async function () {
  var env = createEnv();
  var bgm = env.findBgm();
  var normalVolume = bgm.volume;

  env.audioConfig.playBehavior = function () { return Promise.reject(new Error('autoplay blocked')); };
  env.GameAudioLayer.play('danger_warning');
  assert.ok(bgm.volume < normalVolume, 'duck applied even though play() will reject');
  await flushMicrotasks();
  assert.strictEqual(bgm.volume, normalVolume, 'rejected play triggers cleanup and restores bgm volume');

  env.audioConfig.playBehavior = null;
  env.GameAudioLayer.play('result_failure');
  var clone = env.lastCreated();
  assert.ok(bgm.volume < normalVolume);
  clone.dispatchEvent({ type: 'ended' });
  assert.strictEqual(bgm.volume, normalVolume);
  // duplicate cleanup events on an already-released clone must be no-ops
  assert.doesNotThrow(function () {
    clone.dispatchEvent({ type: 'error' });
    clone.dispatchEvent({ type: 'abort' });
  });
  assert.strictEqual(bgm.volume, normalVolume, 'duplicate cleanup events do not double-release the duck count');

  env.GameAudioLayer.play('ui_click');
  var clickClone = env.lastCreated();
  assert.doesNotThrow(function () {
    clickClone.dispatchEvent({ type: 'ended' });
    clickClone.dispatchEvent({ type: 'error' });
    clickClone.dispatchEvent({ type: 'abort' });
  });

  env.GameAudioLayer.destroy();
});

test('destroy tears down listeners, UI, timers, and audio; init can run again afterward', function () {
  var env = createEnv();
  assert.strictEqual(env.body.children.length, 1, 'controls UI mounted on init');

  env.GameAudioLayer.play('danger_warning');
  assert.strictEqual(env.timers.pendingCount(), 1, 'duck fallback timer scheduled');

  var bgm = env.findBgm();
  env.GameAudioLayer.start();

  env.GameAudioLayer.destroy();

  assert.strictEqual(env.body.children.length, 0, 'UI removed on destroy');
  assert.strictEqual(bgm.paused, true, 'bgm paused on destroy');
  assert.strictEqual(env.timers.pendingCount(), 0, 'pending duck timers cleared on destroy');
  assert.strictEqual(env.GameAudioLayer.getState(), null, 'state cleared after destroy');

  var btn = env.makeButton();
  env.firePointer(btn, true);
  assert.strictEqual(env.GameAudioLayer.getState(), null, 'pointerdown listener removed after destroy');
  assert.strictEqual(env.body.children.length, 0);

  env.fireCustomAudio({ cue: 'ui_click', userGesture: true });
  assert.strictEqual(env.GameAudioLayer.getState(), null, 'game-audio listener removed after destroy');

  env.GameAudioLayer.init();
  assert.notStrictEqual(env.GameAudioLayer.getState(), null, 'init works again after destroy');
  assert.strictEqual(env.body.children.length, 1, 'controls UI mounted again after re-init');

  env.GameAudioLayer.destroy();
});

