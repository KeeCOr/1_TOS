const COMBAT_SFX_ROOT = '/audio/sfx/';

/** Plays a short combat cue without blocking the turn-result UI. */
export function playCombatSound(cue: string): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;

  const audio = new Audio(`${COMBAT_SFX_ROOT}${cue}.wav`);
  audio.volume = 0.35;
  void audio.play().catch(() => {
    // Browsers may defer sound until the player has interacted with the page.
  });
  return true;
}
