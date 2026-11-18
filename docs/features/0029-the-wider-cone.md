# 0029 — The wider cone

**Status:** approved 2026-11-18
**Milestone:** M6
**Drafted:** 2026-11-18

## Goal

Solving the case of Marketing earns the first upgrade of the lamp. The cone is one and a
half times as wide, and the lamp is stronger: the shadow walls of HR and Accounting, which
held until now, give way to it. The floor opens.

## Scope

Built on 0028 as merged. No tile changes, no map changes.

**In:**

- `GameState.upgrades`: the upgrades the player has earned.
- The step that solves a case earns the upgrade of its region, if the world data has one:
  the upgrade joins `upgrades`, and the lamp's strength grows by one.
- The cone's spread: one half without the wider cone, three quarters with it — in the test
  that lights a creature, a wall and a trace, and in the picture.
- `public/sprites/lamp-wide.png`, the wider cone's sheet, from the lamp's generator.
- A notice that says the lamp shines wider and stronger.
- The language table gets one key in German and English.
- With the implementation: `gameplay.md` §2 and §5; `world.md` §1; `architecture.md` §2, §5
  and §7; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the colour filter and the longer battery (M6, with their cases) ·
larger creatures that only the wider cone captures (`gameplay.md` §2; with the first medium
creature) · the cases of HR and Accounting — the rooms open, their cases come later · a
person who hands the upgrade over, and the vendor as advisor (M6) · the upgrades in the
journal · a longer cone · choosing between upgrades · giving an upgrade back.

## Behaviour

Refines `gameplay.md` §2 and §5, `world.md` §1, `architecture.md` §2 and §5 and `visual.md`
§3.

### Earning an upgrade

`GameState.upgrades` is the list of the ids of the upgrades the player has, in the order
they were earned. It is empty at the start.

The world data (`src/game/world.ts`) has held the upgrades since 0014, each with the region
whose case earns it: `wide-cone` in `marketing`, `filter` in `hr`. The step that solves a
case (0024) also earns the upgrade of that region, when the table has one and the player
does not have it yet:

- its id joins `upgrades`;
- `lamp.strength` becomes the base strength plus the number of upgrades (`strengthAfter`).

Solving Sales earns nothing. Solving Marketing earns `wide-cone` and a strength of 2. The
rule holds for every upgrade of the table; what the filter does beyond its strength is its
own feature. The wake of 0009 keeps `upgrades` and the strength.

### The cone's spread

The cone of 0007 opens with a slope of one half to each side: at its end, 48 px from the
apex, it is 48 px wide. The **spread** is that slope. It is one half without `wide-cone`
and three quarters with it — the cone is then 72 px wide at its end, one and a half times
as wide, *tune*. Its length stays 48 px.

The spread is derived from `upgrades` in every step and every frame; the state has no field
for it. It enters every place that asks whether something is in the cone:

- `inCone` (0007): a point is in the cone when its distance from the axis is at most its
  distance along the axis times the spread;
- `meetsCone` (0014): a box meets the cone by the same slope;
- so a creature freezes (0008), a wall is in the light (0014) and a trace is seen (0022) in
  the wider cone, each by its own rule otherwise unchanged.

### What the stronger lamp does

A shadow wall gives way when the lamp's strength meets its density (0014). With a strength
of 2 the walls of HR and Accounting are lifted after one second of light, like the thin
ones before. The wall of Development, density 3, still holds, and the notice of 0016 still
says so there. Nothing else asks for the strength in this feature.

### The notice

`game/notice` gains the notice of an upgrade: the key of the upgrade, shown for
`UPGRADE_NOTICE_STEPS`, 120 steps, after the notice of the solved case — while
120 ≤ `tick` − `at` < 240, with `at` the step that solved the case which earned it. So the
player reads first that the case is solved and then what it earned. It has the place of the
case's notice in the order: after a wall that holds, before a found trace.

| Key | `de` | `en` |
|---|---|---|
| `notice.upgrade-wide-cone` | `Die Lampe leuchtet jetzt breiter und stärker.` | `The lamp now shines wider and stronger.` |

### Drawing

`public/sprites/lamp-wide.png` is 288x72: four 72x72 frames, one per facing in the order of
the lamp's sheet, the cone of spread three quarters as a yellow checkerboard like the cone
of 0007. The apex sits at (36, 0) for down, (36, 71) for up, (71, 36) for left and (0, 36)
for right. `tools/placeholder-lamp.ts` generates it from `inCone` with the wider spread.

The scene draws the cone from this sheet when the player has `wide-cone`, placed by its
apex as the cone of 0007 is, and from the lamp's sheet otherwise.

## Acceptance criteria

1. The initial state has `upgrades` empty and a strength of 1, and survives a JSON round
   trip at the start and with `wide-cone` earned.
2. The step that solves Marketing sets `upgrades` to `['wide-cone']` and `lamp.strength` to
   2; the step that solves Sales changes neither.
3. Solving Marketing a second time is not possible (0024), and no step earns an upgrade
   twice.
4. The wake keeps `upgrades` and the strength.
5. With the spread one half, a point 40 px along the axis is in the cone at 20 px from it
   and not at 20.5 px; with three quarters it is in the cone at 30 px and not at 30.5 px.
   The length is 48 px with either.
6. A box 26 px beside the axis and 40 px along it meets the wider cone and not the narrow
   one.
7. With `wide-cone`, a creature 28 px beside the axis at 40 px freezes and is captured after
   60 steps; without it the same creature is not lit.
8. With a strength of 2 a wall of density 2 is lifted in the 60th lit step and a wall of
   density 3 holds, with the notice of 0016; with a strength of 1 the wall of density 2
   holds as before.
9. The notice is `notice.case-solved` for the first 120 steps after Marketing is solved and
   `notice.upgrade-wide-cone` for the next 120, and none after; after Sales is solved there
   is no notice of an upgrade.
10. `lamp-wide.png` is 288x72, equals its generator's output, holds in each frame exactly
    the pixels of the cone of spread three quarters from that frame's apex, and passes the
    asset test.
11. The scene draws the cone from the wide sheet with its top-left corner at the apex minus
    the frame's apex place when the player has `wide-cone`, and from the lamp's sheet as in
    0007 otherwise.
12. `de` and `en` hold the key of the table; it is one line and fits the bar.
13. A state without `wide-cone` steps and is drawn exactly as before this feature: the 600
    recorded steps of 0020 give the same digest, and the tests of 0007, 0008, 0014 and 0022
    pass unchanged.

## Test plan

- **Unit, `game/lamp`:** the spread from `upgrades`; criterion 5 for the four facings; the
  apex places of the wide frames.
- **Unit, `game/shadow`:** criterion 6 for a horizontal and a vertical box; `meetsCone` with
  the narrow spread gives what it gave.
- **Unit, `game/cases`:** criteria 2 and 3 on the fixture of 0024 with a second case built
  in the test; an upgrade of a region without a case is never earned.
- **Unit, creatures, walls, traces:** criterion 7; criterion 8 with both strengths; a trace
  at the cone's wider edge found with `wide-cone` and not without.
- **Unit, `game/notice`:** criterion 9 at 0, 119, 120, 239 and 240 steps.
- **Unit, state:** the initial state; the round trips of criterion 1; the wake; the digest
  of criterion 13.
- **Unit, sprites:** the generator against the committed sheet; criterion 10 pixel by pixel
  against `inCone`.
- **Assets:** the sheet against Endesga 32.
- **Unit, scene:** criterion 11 for the four facings, with and without the upgrade.
- **Unit, text:** the key in both languages.
- **Architecture:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.upgrades` is empty.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks.

**Steps:**

1. Walk right into the corridor, up it into the wide corridor along the top, and left to
   the leftmost violet strip in its upper wall. Face it and hold `Space` for three seconds.
2. Expected: the cone is as wide at its end as it is long. The strip holds, and the line at
   the bottom says `Dieser Schatten ist zu dicht für die Lampe.`
3. Walk down the corridor to the wide corridor at its lower end. Lift the violet strip in
   the doorway at the left of its lower wall and walk in. Find the five traces: above the
   right screen of the first and of the second island of the upper row, above the left
   screen of the fourth island of the upper row, above the left screen of the first island
   of the lower row, and above the printer at the lower wall.
4. Expected: after the fifth, the journal's tab `Fälle` shows `Spuren: 5 von 5` under
   `Marketing`.
5. Walk to the colleague in the red shirt and press `E` three times, a moment apart.
6. Expected: the box is gone, the room clears, and the line says
   `Der Fall ist gelöst. Sieh ins Journal.`
7. Wait three seconds without pressing a key.
8. Expected: about two seconds after the box went, the line changes to
   `Die Lampe leuchtet jetzt breiter und stärker.` and is gone two seconds later.
9. Hold `Space` and turn once round.
10. Expected: the cone is clearly wider than before — at its end about one and a half times
    as wide as it is long — in all four directions.
11. Walk back to the leftmost violet strip in the upper wall of the wide corridor along the
    top. Face it and hold `Space`.
12. Expected: the strip thins out and is gone after about a second. The doorway is open.
13. Walk right along that corridor to the next violet strip and hold the lamp on it.
14. Expected: it is gone after about a second.
15. Walk on to the third violet strip, the solid one, and hold the lamp on it for three
    seconds.
16. Expected: it holds, and the line says `Dieser Schatten ist zu dicht für die Lampe.`

**Feel:**

- Is the wider cone felt at once — is one and a half times the right step?
- The upgrade comes with the solved case, with one line and no person. Is that enough of a
  moment?
- Two lines one after the other, four seconds in all: readable, or too much?
- Do the two rooms that open now feel earned?

**Result:** passed 2026-11-19, steps 1–16. Feel: the wider cone is felt at once, and one
and a half times is the right step; the upgrade with the solved case, one line and no
person, is enough of a moment; the two lines one after the other are readable; the two
rooms that open feel earned.

## Open questions

None. Five were settled on 2026-11-18, each as drafted:

- One and a half times: the cone's slope grows from one half to three quarters, 72 px wide
  at its end; its length stays 48 px.
- Earned by the case: the upgrade comes in the step that solves Marketing, and a line says
  so. Nobody hands it over; the vendor's part is M6.
- Wider and stronger at once: the same moment widens the cone and raises the strength to 2,
  so that HR and Accounting open.
- The two rooms: HR and Accounting can be entered after this feature and have nothing of
  their own until their features come. That is accepted for the time between.
- The words: `Die Lampe leuchtet jetzt breiter und stärker.`, shown for two seconds after
  the notice of the solved case.
