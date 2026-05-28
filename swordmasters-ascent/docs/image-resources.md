# Image Resource List

This list tracks the image assets needed for the 10-floor version of Swordmaster's Ascent.

## Existing Assets

| Path | Purpose | Status |
| --- | --- | --- |
| `public/bg/background.png` | Battle background | Existing |
| `public/chars/player.png` | Player character | Existing |
| `public/enemy/enemy.png` | Generic enemy fallback | Existing |
| `public/next.svg` | UI icon | Existing |

## Required Character Assets

These files should use a centered full-body sprite with transparent background, visible feet, and enough padding so the floor board can anchor the character cleanly.

| Path | Korean Role | Purpose | Status |
| --- | --- | --- | --- |
| `public/chars/ghost.png` | 잔상/유령 | Legacy or unknown enemy fallback | Generated and applied |
| `public/chars/goblin.png` | 검사 연습생 | Early-floor basic swordsman | Generated and applied |
| `public/chars/orc_warrior.png` | 검사 전사 | Heavy early-floor swordsman | Generated and applied |
| `public/chars/dark_mage.png` | 검사 마법사 | Sword-and-magic enemy | Generated and applied |
| `public/chars/knight_swordsman.png` | 검사 기사 | Armored mid-floor swordsman | Generated and applied |
| `public/chars/swift_swordsman.png` | 검사 방랑자 | Fast evasive swordsman | Generated and applied |
| `public/chars/duelist_swordsman.png` | 검사 결투사 | Precision duelist enemy | Generated and applied |
| `public/chars/executioner.png` | 검사 집행관 | Late 10-floor elite enemy | Generated and applied |
| `public/chars/samurai_boss.png` | 검사 대장 | Boss character | Generated and applied |
| `public/chars/elder_boss.png` | 검사 원로 | Boss character | Generated and applied |

## Optional Later-Floor Assets

The current plan limits the tower to 10 floors, so these are not required for the first playable resource pass.

| Path | Korean Role | Purpose | Status |
| --- | --- | --- | --- |
| `public/chars/arcane_swordsman.png` | 검사 마도사 | Floor 11+ template | Deferred |
| `public/chars/judge_boss.png` | 검사 심판자 | Later boss template | Deferred |
| `public/chars/king_boss.png` | 검왕 | Final boss template | Deferred |

## App Asset

| Path | Purpose | Status |
| --- | --- | --- |
| `icon.ico` | Electron build icon referenced by `package.json` | Generated |

## Applied UI

| Area | Change | Status |
| --- | --- | --- |
| Enemy portraits | Enemy cards, mini grid, and large battle character now resolve generated sprite assets by template image id | Applied |
| Main action buttons | Added compact framed action glyph UI so command buttons read more like game controls | Applied |

## Generation Style Guide

- Dark fantasy 2D game sprite.
- Full-body, three-quarter front view.
- Centered composition with visible feet and clean silhouette.
- No text, no watermark, no UI, no floor shadow.
- Avoid green in the subject when generating chroma-key source images.
