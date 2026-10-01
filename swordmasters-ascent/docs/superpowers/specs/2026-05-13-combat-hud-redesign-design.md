# Combat HUD Redesign Design

Date: 2026-05-13
Project: Swordmasters Ascent
Status: Approved for implementation planning

## Goal

Redesign the battle screen HUD so combat state is easier to read at a glance. The first improvement target is the current feeling that HP/MP/ST, distance, row position, enemy intent, logs, and detailed modifiers are scattered across the 1280x720 battle view.

The redesign should keep the existing combat rules and game feel intact. This is a layout and information-architecture pass, not a balance or mechanics change.

## Current Context

The active battle screen in `src/components/SwordmastersAscent.tsx` already uses a fixed 1280x720 stage with:

- Full-screen background art and character sprites.
- A perspective floor grid for distance and row position.
- Top-left and top-right character status blocks.
- A bottom command area with main actions, sub-actions, mini distance display, logs, and enemy details.
- Temporary overlays for dice rolls, result flashes, floating damage text, and initiative text.

The visual foundation is strong, but the player must scan too many places to answer one turn-level question: "What is my state, what is the enemy likely to do, and what should I press?"

## Design Direction

Use a "game board + tactical console" structure.

### 1. Top Situation Bar

The top bar becomes the primary combat state area.

Left side:
- Floor.
- Player level and name.
- Player HP/MP/ST bars.
- Current condition.

Center:
- Current distance label.
- Row match indicator.
- Enemy intent hint.
- Optional range warning when the selected or likely action is out of range.

Right side:
- Enemy name and boss marker.
- Enemy HP/MP/ST bars.
- Enemy condition.
- Save button, kept visually secondary.

This makes the top bar answer: "Who is fighting, what is the current situation, and what is the enemy telegraph?"

### 2. Central Game Board

The central board should preserve the strongest existing visual elements:

- Background image.
- Character sprites.
- Perspective grid.
- Position highlights.
- Floating damage and heal text.
- Screen flashes and movement feedback.

Persistent informational panels should not sit in the middle of the stage. Dice and result details may appear as a temporary overlay, but they should feel like a verdict pop-up rather than a permanent HUD block.

### 3. Bottom Tactical Console

The bottom console becomes the decision area.

Left panel:
- Main action buttons during `select_main`.
- Sub-action list during `select_sub`.
- Disabled, recommended, and countered states remain visible.

Center panel:
- Compact distance and row mini-map.
- Recent battle log.
- Turn result summary during rolling/result states.

Right panel:
- Enemy abilities and elemental stats.
- Player tactical modifiers that matter this turn: active buffs/debuffs, injuries, titles, synergies, magic cooldown.
- Avoid duplicating full HP/MP/ST here because those belong in the top bar.

This makes the bottom console answer: "What are my choices, and what supporting details matter before I choose?"

## Information Priority

The battle screen should prioritize information in this order:

1. Survival state: HP, stamina, MP, dangerous injuries or low resources.
2. Spatial state: distance, row alignment, range.
3. Enemy intent: action telegraph and likely sub-action hint.
4. Player decision: main action and sub-action choices.
5. Secondary detail: logs, titles, abilities, elemental values, synergies.

When space is tight, lower-priority details should compress or move behind compact summaries before higher-priority information is reduced.

## Components and Boundaries

The initial implementation should stay inside `src/components/SwordmastersAscent.tsx` unless extraction becomes necessary for readability.

Recommended internal component boundaries:

- `BattleTopBar`: player status, enemy status, center situation readout.
- `BattleStage`: background, grid, characters, VFX, floating text, dice overlay.
- `BattleCommandPanel`: main and sub-action controls.
- `BattleMiniMapPanel`: compact distance/row display and recent log.
- `BattleDetailPanel`: enemy abilities plus player tactical modifiers.

Extraction can be done inside the same file first. A later cleanup can move these to separate component files if the implementation becomes too large.

## Non-Goals

- No combat balance changes.
- No changes to save data shape.
- No replacement of existing art assets.
- No new enemy AI or reward logic.
- No broad rewrite of `gameData.ts`.
- No mobile-first redesign in this pass. The fixed 1280x720 stage can remain, but the layout should be more internally coherent.

## Error Handling and Edge Cases

- Missing player, enemy, or intent should keep returning `null` as today.
- Empty inventory and empty magic slots must still hide or disable unavailable actions.
- Long Korean labels, garbled legacy labels, or enemy names should truncate instead of pushing layout.
- Active effects, injuries, titles, and synergies can overflow; summaries should wrap in a bounded panel, not expand the HUD vertically.
- Dice/result overlays must not block action buttons except during non-interactive rolling/result steps.

## Testing and Verification

Minimum verification:

- Run `npm run build`.
- Manually inspect the battle screen in browser or Electron-sized viewport.
- Confirm `select_main`, `select_sub`, `rolling`, and `result` states remain readable.
- Confirm reward, event, tutorial, naming, stat roll, and gameover phases still render.

Visual acceptance criteria:

- A player can find HP/MP/ST for both sides from the top bar without scanning the bottom.
- Distance and row alignment are visible in the top center and reinforced by the bottom mini-map.
- Main and sub-action controls stay in a stable bottom-left decision area.
- The central stage remains mostly clear for characters and combat effects.
- Text does not overlap or escape buttons/panels at the 1280x720 target size.

