import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const rate = 44100
function wav(name, seconds, render) {
  const frames = Math.floor(rate * seconds), out = Buffer.alloc(44 + frames * 2)
  out.write('RIFF', 0); out.writeUInt32LE(36 + frames * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(frames * 2, 40)
  for (let i = 0; i < frames; i += 1) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, render(i / rate, i / frames))) * 32767), 44 + i * 2)
  const path = resolve('public/audio/sfx', `${name}.wav`); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, out)
}
const chirp = (a, b, amp = .18) => (t, p) => Math.sin(2 * Math.PI * (a + (b - a) * p) * t) * Math.sin(Math.PI * p) * amp
wav('stance', .22, chirp(250, 420)); wav('slash', .16, chirp(760, 260)); wav('heavy-slash', .24, chirp(520, 110, .25)); wav('whoosh', .18, chirp(310, 900, .14)); wav('air-cut', .12, chirp(800, 420, .12)); wav('hit-low', .15, chirp(150, 80, .24)); wav('guard', .23, chirp(360, 620, .15)); wav('chime', .48, (t, p) => (Math.sin(2 * Math.PI * 523.25 * t) + Math.sin(2 * Math.PI * 659.25 * Math.max(0, t - .13))) * (1 - p * .5) * .11)
