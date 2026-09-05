# Swordmasters Ascent — Steam Achievements

---

## Stats

| API Name | Type | Description |
|----------|------|-------------|
| `STAT_RUNS_STARTED` | INT | Total runs started |
| `STAT_RUNS_COMPLETED` | INT | Runs that ended (win or death) |
| `STAT_HIGHEST_FLOOR` | INT | All-time highest floor reached |
| `STAT_ENEMIES_DEFEATED` | INT | Total enemies defeated |
| `STAT_STAMINA_SPENT` | INT | Total stamina spent across all runs |
| `STAT_ITEMS_COLLECTED` | INT | Total items collected |
| `STAT_TITLES_UNLOCKED` | INT | Distinct titles unlocked |

---

## Achievements

| API Name | EN Name | KO Name | How to Unlock |
|----------|---------|---------|---------------|
| `ACH_FIRST_RUN` | First Step | 첫 걸음 | Begin your first run |
| `ACH_FIRST_FLOOR_5` | Floor 5 Survivor | 5층 생존자 | Reach floor 5 |
| `ACH_FIRST_FLOOR_10` | Ascending | 상승 중 | Reach floor 10 |
| `ACH_FIRST_FLOOR_25` | Tower Climber | 탑 등반자 | Reach floor 25 |
| `ACH_FIRST_FLOOR_50` | High Altitude | 고도의 영역 | Reach floor 50 |
| `ACH_FIRST_FLOOR_100` | Summit Legend | 정상의 전설 | Reach floor 100 |
| `ACH_FIRST_ENEMY` | First Duel | 첫 결투 | Defeat your first enemy |
| `ACH_TEN_ENEMIES` | Ten Cuts | 열 번의 베기 | Defeat 10 enemies in one run |
| `ACH_STAMINA_MASTER` | Breath Control | 호흡 제어 | Win a floor fight with exactly 1 stamina remaining |
| `ACH_POSITIONAL_PUNISH` | Spacing Master | 거리의 달인 | Win 5 fights using only positional movement and no attack cards |
| `ACH_TITLE_FIRST` | Named Blade | 이름 붙은 검 | Unlock your first title |
| `ACH_TITLES_ALL` | Living Legend | 살아있는 전설 | Unlock all available titles |
| `ACH_ITEM_HOARDER` | Well Equipped | 완전 무장 | Carry 5 items simultaneously |
| `ACH_HUNDRED_ENEMIES` | Century Mark | 백 번의 전투 | Defeat 100 enemies total (across all runs) |
| `ACH_LONG_STREAK` | Deathless Sprint | 죽음 없는 질주 | Clear 15 consecutive floors without taking lethal damage |

---

## Implementation Notes

- Steam API: `ISteamUserStats`
- `STAT_HIGHEST_FLOOR` should only update when the previous record is exceeded (not reset on death)
- `ACH_STAMINA_MASTER` checks stamina at the exact moment the enemy dies
- `ACH_POSITIONAL_PUNISH` requires tracking card types used per fight
- All achievements unlockable in a single offline session
- Replace App ID 480 with real Steamworks App ID before submission
