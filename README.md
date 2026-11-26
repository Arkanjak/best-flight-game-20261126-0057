# SKYLANE — Valley Patrol

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Arkanjak/best-flight-game-20261126-0057/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Arkanjak/best-flight-game-20261126-0057/reward.svg)](https://make.fun)

A complete, original flight game that plays offline in a desktop browser from static files.
Take off from a valley strip, fly chase or cockpit view over hills, forest, rock and a lake,
and finish the mission you picked: thread eight rings, drop a crate into a glowing zone, or
beat the clock through low canyon gates. Throttle discipline matters — fuel burns with power,
a slow nose-high aeroplane stalls, and every landing is judged.

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory (`MAKEFUN_OUTPUT_DIR`,
or `/output` in the grader) and writes `dossier.json`.

## Controls

- Arrow keys: pitch and bank (mouse movement also steers)
- W / S: throttle up / down · B: brake
- Space or click: drop cargo
- C: chase / cockpit camera · P: pause · R: restart · M: mute
- 1 / 2 / 3: choose mission · Enter: fly

## Missions

1. **Ring Run** — thread 8 rings over the valley, then land on the strip.
2. **Valley Delivery** — drop the crate inside the glowing zone below 750 FT, then land.
3. **Canyon Dash** — clear 8 low gates inside 3:00; low flying earns bonus points.

Landing quality, hull damage, fuel and time all feed the final grade.
