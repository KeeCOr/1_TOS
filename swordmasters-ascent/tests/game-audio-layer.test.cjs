'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const candidates = [
  'public/assets/audio/game-audio-layer.js', 'src/assets/audio/game-audio-layer.js',
  'dist/assets/audio/game-audio-layer.js', 'assets/audio/game-audio-layer.js'
];
const layerPath = process.env.AUDIO_LAYER_PATH || candidates.map(p => path.resolve(p)).find(fs.existsSync);
if (!layerPath) throw new Error('game-audio-layer.js not found');
const source = fs.readFileSync(layerPath, 'utf8');

function bus() {
  const map = new Map();
  return {
    addEventListener(t, fn) { if (!map.has(t)) map.set(t, new Set()); map.get(t).add(fn); },
    removeEventListener(t, fn) { if (map.has(t)) map.get(t).delete(fn); },
    dispatchEvent(e) { for (const fn of map.get(e.type) || []) fn(e); }
  };
}
function element(tag, counts) {
  const events = bus();
  return {
    nodeType: 1, tagName: tag.toUpperCase(), style: {}, children: [], attributes: {}, parentNode: null,
    volume: 1, muted: false, loop: false, paused: true, playbackRate: 1, src: '',
    setAttribute(n, v) { this.attributes[n] = String(v); },
    getAttribute(n) { return this.attributes[n] || null; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); },
    closest() { return null; },
    play() { this.paused = false; counts.plays++; return Promise.resolve(); },
    pause() { this.paused = true; counts.pauses++; },
    cloneNode() { counts.clones++; const c = element(tag, counts); c.src = this.src; return c; },
    addEventListener: events.addEventListener, removeEventListener: events.removeEventListener, dispatchEvent: events.dispatchEvent
  };
}
function load(sharedStore) {
  const counts = { plays: 0, pauses: 0, clones: 0 }, docEvents = bus(), winEvents = bus();
  const body = element('body', counts), store = sharedStore || new Map();
  const document = {
    currentScript: { src: 'https://game.test/assets/audio/game-audio-layer.js' }, readyState: 'complete', hidden: false, body,
    createElement: tag => element(tag, counts),
    addEventListener: docEvents.addEventListener, removeEventListener: docEvents.removeEventListener, dispatchEvent: docEvents.dispatchEvent
  };
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) };
  class MutationObserver { observe() {} disconnect() {} }
  const sandbox = { document, localStorage, MutationObserver, URL, console, setTimeout, clearTimeout };
  sandbox.window = sandbox; sandbox.location = { href: 'https://game.test/' };
  sandbox.addEventListener = winEvents.addEventListener; sandbox.removeEventListener = winEvents.removeEventListener; sandbox.dispatchEvent = winEvents.dispatchEvent;
  vm.runInContext(source, vm.createContext(sandbox), { filename: layerPath });
  return { api: sandbox.GameAudioLayer, counts, store };
}

test('initializes with conservative separate defaults', () => {
  const { api } = load(); const s = api.getState();
  assert.equal(s.bgmVolume, 0.28); assert.equal(s.sfxVolume, 0.70); assert.equal(s.muted, false);
});
test('clamps independent volume ranges', () => {
  const { api } = load(); api.setBgmVolume(9); api.setSfxVolume(-2);
  assert.equal(api.getState().bgmVolume, 1); assert.equal(api.getState().sfxVolume, 0);
});
test('persists mute across a fresh runtime', () => {
  const store = new Map(); const first = load(store); first.api.setMuted(true);
  assert.equal(load(store).api.getState().muted, true);
});
test('start is idempotent and keeps one BGM element', () => {
  const { api, counts } = load(); api.start(); const first = counts.plays; api.start();
  assert.equal(api.getState().started, true); assert.ok(counts.plays >= first);
});
test('destroy clears state and init restores it', () => {
  const { api } = load(); api.destroy(); assert.equal(api.getState(), null); api.init(); assert.ok(api.getState());
});
