# 0019 — The language switch

**Status:** draft
**Milestone:** M4
**Drafted:** 2026-11-17

## Goal

The player can switch the game between German and English with one key, at any moment. Every
text on screen changes at once, and a short line says which language is on. It is the interim
switch until the title screen of M8 holds it.

## Scope

Built on 0017 as merged; it needs nothing of 0018 and holds with it or without it. No change
to `src/game/`, to the state or to the map.

**In:**

- The action `language`, on `L`, toggled in `main.ts` like `fullscreen`: once per press, never
  passed to the game.
- The language as a setting outside the state: `main.ts` holds it and hands it to the scene
  with every frame.
- `nextLanguage` in `src/text/text.ts`.
- The line `notice.language`, shown for two seconds after a switch where no other text is on
  screen.
- The `lang` attribute of the page follows the language.
- `window.shadowAi.language` for the smoke test.
- With the implementation: `gameplay.md` §8; `architecture.md` §4, §5 and §8; `vision.md` §7;
  `testing.md` §2; the README.

**Out, explicitly:** the title screen and the switch on it (M8) · remembering the language
over a reload — storing anything in the browser is decided with the save states (M8) ·
choosing the first language from the browser's settings (M8, with the title screen) · a third
language · a hint on screen that names the key · the language in `GameState` — it is a
setting of the player, not a fact of the game, and a saved game does not carry it.

## Behaviour

Refines `vision.md` §7 and `architecture.md` §4, §5 and §8.

### The setting

The language is not part of `GameState` (INV-1 is untouched) and `src/game/` does not know
it: the game passes keys, and only the drawing turns a key into characters (0016). `main.ts`
holds the settings of the scene:

- `language`: a `Language`, `DEFAULT_LANGUAGE` — German — on every load;
- `switchedAt`: the `tick` of the state at the last switch, or `null` when the language was
  never switched since the load.

`SceneContent` loses its `language`. `drawScene` takes the settings as a fourth argument,
`{ language, switchedAt }`, and draws every text in `language`.

`src/text/text.ts` gets `nextLanguage(language)`: the language after it in `LANGUAGES`, the
first after the last. With two languages a press toggles.

### The key

The input table of `main.ts` gets `language` ← `KeyL`. It is handled where `fullscreen` is:
on the `keydown` of `L` without `repeat` and without Ctrl, Alt or Cmd, `main.ts` sets
`language` to `nextLanguage(language)`, `switchedAt` to the `tick` of the state of the last
frame, and the `lang` attribute of the page's root element to the new language. The action
never reaches the game; `GameInput` is unchanged. A held key switches once. With Ctrl, Alt or
Cmd the browser keeps its own shortcut, and the language stays. Before the content has
loaded the key does nothing.

The switch works in every situation: while walking, with the lamp held, with a dialogue
open, in the dark. Nothing in the state changes, so nothing in the game does.

### What changes on screen

From the next frame every text is drawn in the new language: the notice of 0016, the page of
an open dialogue — the same page in the other language, with that language's own line
breaks — and everything later features draw.

`LANGUAGE_NOTICE_STEPS` is 120, two seconds, *tune*. The **language line** is the key
`notice.language`, drawn like the notice of 0016: the bar (8, 158, 304, 18) in `#181425`
with the line centred in it. It is drawn when all of these hold:

1. `switchedAt` is not `null`, and 0 ≤ `tick` − `switchedAt` < `LANGUAGE_NOTICE_STEPS`;
2. no dialogue is open;
3. the notice of 0016 does not show.

So the line appears where a switch would otherwise show nothing. Where a text is on screen,
that text changes and is the answer. The lids of the dark close over the line as they close
over everything.

| Key | `de` | `en` |
|---|---|---|
| `notice.language` | `Sprache: Deutsch` | `Language: English` |

The line names the language that is on, in that language.

### For the smoke test

`window.shadowAi` becomes `{ state, language }`: the state passed to the last render, and the
language of the last render.

## Acceptance criteria

1. `nextLanguage('de')` is `'en'` and `nextLanguage('en')` is `'de'`.
2. `de` and `en` hold `notice.language` as in the table; it is one line, and the notice bar
   holds it.
3. `drawScene` draws the notice of 0016 and the page of an open dialogue in the language of
   its settings: with `en`, the first glyph of the notice is that of `T` and the notice has
   38 characters; with `de` everything is drawn as before this feature.
4. With `switchedAt` 100 and no other text, the scene draws the bar and the language line at
   `tick` 100 and at `tick` 219, and neither at `tick` 220, at `tick` 99 or with `switchedAt`
   `null`.
5. With a dialogue open, or with the notice of 0016 showing, the scene draws no language
   line at any `tick`.
6. A press of `L` switches the language once; a key held down does not switch again.
7. After a switch the `lang` attribute of the page's root element is the new language.
8. A reload starts in German.
9. `src/game/` is unchanged: this feature touches no file under it, and none of them imports
   `Language`.

## Test plan

- **Unit, text:** criterion 1; `notice.language` in both languages; the key rule; the glyph
  test covers it.
- **Unit, scene:** criterion 3 with the notice state of 0016 and with the dialogue state of
  0017, each in `de` and in `en`; criterion 4 at the four ticks and with `null`; criterion 5.
  The scene tests of 0016 and 0017 pass the settings `{ language: 'de', switchedAt: null }`
  and expect what they expected.
- **Architecture:** `tests/arch/` gains one rule — no file under `src/game/` imports the
  name `Language`.
- **Smoke:** after loading, `window.shadowAi.language` is `de` and the root element's `lang`
  is `de`; after one press of `L` both are `en`; after a second press both are `de`. The
  press goes through the page's keyboard, so the test covers the table and the handler of
  `main.ts` (criteria 6 and 7).
- **Assets, fixtures:** unchanged.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `E` or `Enter` talks, `L` switches the language.

**Steps:**

1. Press `L` once.
2. Expected: a dark bar appears at the bottom with the line `Language: English`. After about
   two seconds it is gone.
3. Press `L` once.
4. Expected: the bar shows `Sprache: Deutsch` and is gone after about two seconds.
5. Hold `L` down for three seconds.
6. Expected: the bar shows `Language: English` once, does not flicker, and is gone after
   about two seconds although the key is still held.
7. Walk right into the corridor, up it to the next doorway on the left, and through that
   doorway into the room above the reception. Stand beside the colleague in the light grey
   shirt and press `E`.
8. Expected: the box shows three lines in English, the first
   `So you can see the shadow too.`
9. Press `L`.
10. Expected: the same box shows German at once, the first line
    `Du siehst den Schatten also auch.`, and there is no bar with a language line.
11. Press `L`, then `E`.
12. Expected: the box shows two lines, the first
    `The lamp holds still whatever stirs in it –`.
13. Press `E`. Leave the room, walk up the corridor into the wide corridor along the top and
    left to the leftmost violet strip in its upper wall. Face it and hold `Space`.
14. Expected: the strip holds, and the line at the bottom is
    `This shadow is too dense for the lamp.`
15. Keep holding `Space` and press `L`.
16. Expected: the line is `Dieser Schatten ist zu dicht für die Lampe.` at once, and no
    language line replaces it.
17. Let go of `Space`. Press `L` together with `Ctrl` — on a Mac with `Cmd`.
18. Expected: the browser does what it does with that shortcut, and no language line
    appears.
19. Click into the game. Press `L` and wait until the line `Language: English` is gone. Reload
    the page and press `L` once.
20. Expected: the line is `Language: English` again — the game had started in German.

**Feel:**

- Is `L` the key you would look for?
- Is two seconds right for the line — and is the line wanted at all?
- Does the English of the three sentences and of the notice read right?
- The game always starts in German. Should it follow the browser's language before M8?

**Result:** not yet walked.

## Open questions

None. Three were settled on 2026-11-18, each as drafted:

- The key: `L` switches the language.
- Start and memory: every load starts in German; the game neither reads the browser's
  language nor remembers the choice. Both are left to M8, with the title screen and the save
  states.
- The language line: a press shows `Sprache: Deutsch` or `Language: English` for two seconds
  where no other text is on screen.
