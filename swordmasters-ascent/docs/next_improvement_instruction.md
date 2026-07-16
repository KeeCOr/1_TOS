# SwordMastersAscent Next Improvement Instruction

Date: 2026-06-24

## Goal
Turn the current biggest project issue into a small, executable improvement batch. This file is intentionally scoped so the next worker can start without rereading the whole workspace audit.

## Instructions
1. Make combat feedback readable in one action: attack windup, hit result, dodge success, and damage response should each have distinct timing/audio/visual cues.
2. Tighten the first 3-minute loop so the player always sees the next ascent target, current reward choice, and consequence of growth selection.
3. Audit runtime visuals touched by combat and replace any final-facing code-drawn artwork or SVG dependencies with bitmap assets before release refresh.

## Completion Rules
- Do not include discarded projects in this batch.
- If gameplay, UI, systems, content, controls, build behavior, or project scope changes, update the project planning document and update log before build/release.
- If runtime source changes, run the nearest available validation and then perform the required build/package step from the project instructions.
- If a folder or asset looks ambiguous, document the decision instead of deleting it.

## Completed 2026-06-30 v1.5.66
- Combat feedback now separates attack windup, hit result, dodge success, range miss cause, and player damage response in one-action-readable copy.
- First-loop reward/growth consequence feedback is represented by the current combat feedback tests and updated planning docs.
- Runtime visuals touched by this pass remain documented; no new final-facing SVG dependency was introduced in this verification pass.
- Validation: `npm test` passed 10/10 node tests.
- Release target: `SwordMastersAscent_v1.5.66_portable.exe`.
