# Combat SFX Resource Update — 2026-10-06

Original synthesized WAV files for the existing `combatFeedback` cue IDs are stored in `public/audio/sfx/`:

`stance`, `slash`, `heavy-slash`, `whoosh`, `air-cut`, `hit-low`, `guard`, and `chime`.

`src/lib/combatAudio.ts` provides a client-side playback helper ready for the combat UI. Playback is best-effort: browsers that require an initial player interaction simply keep visual feedback, without interrupting the turn-result UI.
