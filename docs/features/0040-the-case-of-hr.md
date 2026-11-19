# 0040 — The case of HR

**Status:** draft
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

The player can solve a fourth case, the first behind the denser shadow. HR has three traces
on its three screens. When all are found, the colleague in the yellow shirt answers honestly:
a tool sorts the applications, and nobody knows by what. The case is solved by the rules of
the first three; the journal gains its fourth entry and its fourth block of the policy,
overview grows to nine, HR gets its colours back, and the lamp becomes strong enough for the
densest shadow on the floor.

## Scope

Built on 0038 as merged. The rules of the cases are those of 0022, 0024, 0025, 0028 and 0037.
This feature adds a case, a colleague who is its source, and pages on the policy tab. No tile
changes; the floor gets a route and three rectangles.

**In:**

- A fifth colleague who walks: the route `person:hr` in HR, a fifth shirt, one everyday
  saying.
- Three traces of HR in `tools/floor-layout.ts` and `floor.tmj`.
- The fourth entry of `CASES`: HR, its source, its answer, its "afterwards", its outcome and
  its policy block; the name of the region for the journal.
- The three hints of the intern for the case, and new words for his last page.
- Pages on the policy tab, three blocks to a page.
- The upgrade the world data gives HR: its strength, and one line of notice.
- The language table gets eleven keys in German and English, and one page changes.
- With the implementation: `world.md` §1, §2 and §3; `gameplay.md` §5, §6 and §7;
  `architecture.md` §2, §5, §6, §7 and §8; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the species of HR — every case has one (`world.md` §4); it comes with a
feature of its own, as the mirage and the lurker did · the works council (`world.md` §3) —
see the open questions · what the colour filter shows: hidden traces and hidden paths
(`gameplay.md` §2), and a look of its own for the lamp — a feature of its own; this one
gives the upgrade its strength and nothing else · the case of Development, whose room can
be entered after this feature and has nothing of its own yet · the vendor (M6) · the head of
the department and further colleagues (`world.md` §3) · more devices in HR — the room has
three screens, and the case has three traces · pages on the cases tab — four entries fit;
pages come with the fifth.

## Behaviour

Refines `world.md` §2 and §3 and `gameplay.md` §5, §6 and §7. Everything that happens is
defined by 0022 (finding a trace), 0024 (the source's answer, the solving step, the journal),
0025 (the cleared region), 0029 (the upgrade a case earns), 0033 (the hints), 0034 (the
close) and 0038 (pages). This section names what is added to their data, and the rules that
are new.

### The way in

HR lies behind a shadow wall of density 2 (`world.md` §1). The wider cone, earned by the case
of Marketing (0029), lifts it. So the case of HR cannot be begun before the case of Marketing
is solved; nothing of that changes here.

### The colleague

A fifth colleague walks, by the rules of 0015 and 0018:

| Route | Points (column, row, pause in steps) | Shirt | Saying |
|---|---|---|---|
| `person:hr` | (6, 5, 300) · (11, 5, 0) · (11, 13, 180) · (11, 5, 0) | `#feae34`, yellow | `talk.hr-everyday` |

The route runs from the desk in the upper left of the room to the table and back; no cell of
it has a solid box. Its four points are written at the end of `floor.tmj`, after the objects
of 0038, with the ids 141 to 144, so that no object of an earlier feature changes its id and
no mover of an earlier feature its place in the state: the colleague of HR is the last mover,
the 23rd. The sheet is `public/sprites/person-5.png`, from the generator of the other four.

### The traces

`TRACES` gets three entries of the region `hr`, after the five of Support, and `floor.tmj`
three more rectangles with the ids 145 to 147; `nextobjectid` is 148. Each lies on the desk
with a screen of a workplace, with its chair on the cell below:

| Trace | Cell | Rectangle | Where |
|---|---|---|---|
| `trace:hr` | (3, 3) | (48, 48, 16, 16) | the desk in the upper left |
| `trace:hr` | (14, 3) | (224, 48, 16, 16) | the desk in the upper right |
| `trace:hr` | (3, 10) | (48, 160, 16, 16) | the desk in the lower left |

HR has three workplaces and no other device, so the case has three traces, not five. From
any place on the cell below a chair, a player who looks up has the screen in the light.

The traces of the earlier cases keep their indices 0 to 14; those of HR are 15 to 17. The
state of a new game has eighteen traces.

### The case

`CASES` gets a fourth entry, after Support:

| Region | Source | The source's answer | Afterwards | Outcome | Policy block |
|---|---|---|---|---|---|
| `hr` | `person:hr` | `talk.hr-source-1`, `talk.hr-source-2` | `talk.hr-after` | `case.hr-outcome` | `policy.hr` |

The region gets its name for the journal: `region.hr`. The case is ready when its three
traces are found, whatever is found elsewhere. The maximum of overview is nine. The cases
tab shows four entries, 36 px apart, in the order Sales, Marketing, Support, HR; the fourth
ends at y = 178.

### The upgrade

The world data gives HR the second upgrade of the lamp, `filter` (0014). By the rule of
0029 the step that solves the case earns it: the lamp's strength becomes 3, and the shadow
wall of Development, of density 3, gives way to it like every wall. This feature adds
nothing to that rule but a line: for two seconds after the line of the solved case, the
notice is `notice.upgrade-filter`.

What the filter shows — hidden traces and hidden paths — is not part of this feature, and
the cone keeps its look. The line says what is true now: the lamp gets through dense
shadow.

### The policy tab

Four blocks do not fit the screen. From this feature on the policy tab has pages of three
blocks, in the order the cases were solved: `POLICY_PER_PAGE` is 3. The page of the journal
(0038) counts on this tab as on the creatures tab: `down` alone turns to the next page, `up`
alone to the one before, and at either end the page stays. A page stacks its blocks from
(16, 36), as 0037 says.

With more than one page the tab shows which one is open — `1 von 2` — with its right end at
x = 304 on the line y = 26, between the rule under the tabs and the first block. With one
page it shows nothing more than before.

Three blocks fit a page when they have ten lines together: a test holds every choice of
three blocks of the table to that, in both languages.

### The hints

`HINTS` (0033) gets the three pages of HR, and the intern asks the cases in the order of
`CASES`: Sales, Marketing, Support, HR. His last page, said when every case is solved, no
longer names HR.

### The close

The close (0034) follows the last case of `CASES`. With this feature it is due only when HR
is solved too. Nothing of 0034 changes.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `region.hr` | `Personal` | `HR` |
| `talk.hr-everyday` | `Zweihundert Bewerbungen auf eine Stelle,` / `und bis Freitag soll ich zehn einladen.` / `Wer liest die bitte alle?` | `Two hundred applications for one job, and` / `I am to invite ten of them by Friday.` / `Who is supposed to read them all?` |
| `talk.hr-source-1` | `Ein Werkzeug sortiert die Bewerbungen vor.` / `Oben stehen die, die es für passend hält –` / `die anderen sehe ich gar nicht mehr.` | `A tool sorts the applications for me. On top` / `are the ones it thinks fit – the others I` / `do not even see any more.` |
| `talk.hr-source-2` | `Wonach es sortiert, weiß ich nicht. Und die` / `Lebensläufe liegen jetzt alle bei einem` / `Anbieter, den hier keiner kennt.` | `What it sorts by, I do not know. And all the` / `CVs now lie with a provider nobody here` / `has heard of.` |
| `talk.hr-after` | `Danke. Ab jetzt lese ich wieder selbst –` / `und wenn mir etwas vorsortiert, will ich` / `wissen, wonach.` | `Thanks. From now on I read them myself –` / `and when something sorts for me, I want to` / `know what by.` |
| `case.hr-outcome` | `Gelöst: Ein Werkzeug sortierte Bewerbungen vor.` | `Solved: a tool pre-sorted the applications.` |
| `policy.hr` | `Über Menschen entscheidet ein Mensch. Was eine` / `Maschine vorsortiert, sieht jemand an – und` / `kann sagen, wonach sortiert wurde.` | `A person decides about people. What a machine` / `has pre-sorted, somebody looks at – and can` / `say what it was sorted by.` |
| `talk.intern-hr-start` | `Dann HR, am Nordflur ganz links. Die laden` / `neuerdings erstaunlich schnell zum Gespräch` / `ein – bei zweihundert Bewerbungen.` | `HR next, far left on the north corridor.` / `Lately they invite people surprisingly fast` / `– with two hundred applications.` |
| `talk.intern-hr-traces` | `In HR stehen nur drei Schreibtische. Schau` / `auf jeden Bildschirm – mehr Geräte haben` / `die da nicht.` | `HR has only three desks. Look at every` / `screen – they have no other devices` / `in there.` |
| `talk.intern-hr-source` | `Gelbes Hemd, läuft zwischen den Tischen hin` / `und her. Frag mal, wer die Bewerbungen` / `eigentlich liest.` | `Yellow shirt, walks back and forth between` / `the desks. Ask who actually reads the` / `applications.` |
| `notice.upgrade-filter` | `Die Lampe schafft jetzt auch dichten Schatten.` | `The lamp now gets through dense shadow too.` |
| `talk.intern-done`, changed | `Mehr weiß ich gerade auch nicht. In der` / `Buchhaltung am Nordflur war noch keiner –` / `was da los ist, erzählst du mir.` | `That is all I know for now. Nobody has been` / `to Accounting on the north corridor yet –` / `you tell me what is going on there.` |

The answer says why first — two hundred applications and a Friday — and then what went
wrong: nobody knows what the tool sorts by, and the CVs lie with a provider nobody knows.
"Afterwards" is the countermeasure in the colleague's own words. The block is the lesson of
the case: no automated decision about people without a person (`world.md` §2) — and whoever
lets a machine sort can say what by. No brand and no person is named.

## Acceptance criteria

1. `floor.tmj` holds the four points of the route `person:hr` with the ids 141 to 144 and
   the three rectangles `trace:hr` with the ids 145 to 147, after the objects of 0038, which
   are unchanged; `nextobjectid` is 148.
2. The initial state of the floor has 23 movers; the first 22 are those of before, and the
   last is a person on the route `person:hr`, drawn from `person-5.png`.
3. No cell of the route has a solid box, and its colleague says `talk.hr-everyday`.
4. Each of the three traces lies in the area of HR on a cell whose `detail` tile is a desk
   with a screen, with a chair on the cell below, and is in the light of a player who looks
   up from any place on the cell below that chair.
5. The initial state of the floor has eighteen traces, none found.
6. `CASES` holds Sales, Marketing, Support and HR, in this order, and `region.hr` exists.
7. HR is ready exactly when its three traces are found, whatever is found in the other
   regions, and each of the others exactly when its own are.
8. With HR ready, its colleague says the answer and the other sources their everyday pages;
   with HR solved, "afterwards".
9. Solving HR with the wider cone gives `upgrades` `['wide-cone', 'filter']` and a lamp of
   strength 3; with all four cases solved overview is nine of nine.
10. With HR solved, the cells of its area are not under shadow, its standing wall has left
    `shadowWalls`, and the wall of Development gives way after 60 lit steps.
11. For 120 steps from the step that solves HR the notice is `notice.case-solved`, for the
    next 120 `notice.upgrade-filter`, and then none.
12. With all four cases solved and a trace of each found, the cases tab draws four entries,
    36 px apart, each with its outcome, and no line below y = 168.
13. With up to three cases solved the policy tab draws exactly what it drew before this
    feature. With four it draws the three blocks solved first on page 0 and the fourth on
    page 1, each page stacked from (16, 36).
14. On the policy tab `down` turns to page 1 and `up` back, each once per press, and neither
    goes past an end; with one page they do nothing. The page is 0 after the journal opens
    and after a turn of the tab.
15. With two pages the policy tab draws `1 von 2` or `2 von 2` right-aligned to x = 304 on
    the line y = 26, in both languages; with one page it draws no mark.
16. Any three blocks of the policy have at most ten lines together, in both languages.
17. The intern says the three pages of HR by the rule of 0033 once the first three cases are
    solved, and `talk.intern-done` with its new words once HR is solved too.
18. With the first three cases solved and HR not, the close of 0034 is not due; 300 steps
    after HR is solved as the last case, it opens.
19. `de` and `en` hold the eleven new keys and the changed page of the intern, each by its
    rule.
20. A state in which no trace of HR is found and nobody talks to its colleague steps as
    before this feature: the 600 recorded steps of 0020 give the same digest, with the movers
    hashed as they were recorded.

## Test plan

- **Unit, floor:** the route's points, the rectangles and their ids; the objects before them
  against a recorded digest; criteria 2 to 5; criteria 9 and 10 on the floor as loaded.
- **Unit, sprites, assets:** `person-5.png` equals its generator's output and uses only
  Endesga 32 without the signature colour; five shirts, each the colour of no other figure.
- **Unit, `game/cases`:** criteria 6 to 9, with three, eight, fifteen and eighteen found.
- **Unit, `game/notice`:** criterion 11.
- **Unit, `game/journal`, `draw-journal`:** criteria 12 to 16; the tests of 0037 for three
  blocks and of 0038 for the pages of the creatures tab unchanged.
- **Unit, `game/hints`:** criterion 17; every case has its hints.
- **Unit, `game/story`:** criterion 18.
- **Unit, text:** the keys in both languages; the rules of 0017, 0022 and 0024 cover them.
- **Unit, state:** the digest of criterion 20.
- **Architecture:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.traces` holds eighteen traces and
  `state.movers` 23 movers.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded, the card (0036) and the call (0026) are passed, and **the case of Marketing
is solved** — the lamp shines wider; without it the way into HR stays closed. Arrow keys or
WASD walk, `Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes the journal.
With the case of Marketing the walk takes about fifteen minutes.

**Steps:**

1. Walk to the wide corridor at the north of the floor, and along it to the left, to the
   violet strip in its upper wall. Hold the lamp on it until it is gone, and walk in.
2. Expected: the room is grey under violet lines. A colleague in a yellow shirt walks in it.
3. Walk to the colleague and press `E`.
4. Expected: the first line is `Zweihundert Bewerbungen auf eine Stelle,`
5. Press `E`. Stand below the chair of the desk in the upper left of the room, face up and
   hold `Space` until the pattern is gone. Do the same at the desk in the upper right and
   at the desk in the lower left.
6. Expected: three times the violet pattern grows on the screen and goes, and the line
   `Spur gefunden. Sie steht im Journal.` appears.
7. Press `J`, then the right arrow.
8. Expected: the tab `Fälle` shows `Personal` and `Spuren: 3 von 3`.
9. Press `J`. Walk to the colleague in the yellow shirt and press `E`.
10. Expected: the first line is `Ein Werkzeug sortiert die Bewerbungen vor.`
11. Press `E`.
12. Expected: the first line is `Wonach es sortiert, weiß ich nicht. Und die`
13. Press `E`.
14. Expected: the box is gone, the corner shows one heart more, all full, the room is in
    colour and its lines thin out, and a line says `Der Fall ist gelöst. Sieh ins Journal.`
15. Wait two seconds.
16. Expected: the line now says `Die Lampe schafft jetzt auch dichten Schatten.`
17. Press `J`, then the right arrow twice.
18. Expected: the tab `Richtlinie` shows a block whose first line is
    `Über Menschen entscheidet ein Mensch. Was eine`.
19. Only if the cases of Sales and Support are solved too, else skip this step and the
    next: press the down arrow.
20. Expected: before the press the tab shows three blocks and, at the upper right, `1 von 2`;
    after it one block and `2 von 2`.
21. Press `J`. Walk along the north corridor to the right, to the next violet strip but one
    in its upper wall, and hold the lamp on it.
22. Expected: the strip gives way after about a second.

**Feel:**

- Three traces instead of five: a relief, or too thin for a case?
- Does the answer sound like somebody with two hundred applications and a Friday?
- Is the block of the policy something a team would accept?
- The line about the lamp: does it say enough about what was won?
- A fourth case by the same rules: still a pleasure, or does HR need its creature first?

**Result:** not yet walked.

## Open questions

Seven, each with the answer the draft is written for:

- **The cut.** This feature is the case. The species of HR comes at once, as a feature of
  its own, as with Marketing and Support.
- **Three traces.** The room has three screens and no other device. The other way is to put
  two more devices into HR, which changes tiles of the map.
- **The colleague.** A fifth colleague who walks, in a yellow shirt, is the source. She or he
  has no name, as the other four.
- **The works council.** Not in this feature. `world.md` §3 makes him part of the HR case —
  "nothing moves there without him" — and that is a rule the cases do not have yet: a second
  person the case needs. Drafted as its own feature after this one, so that the author can
  say what he does.
- **The upgrade.** The world data gives HR the colour filter (`world.md` §1). Solving the
  case earns it by the rule of 0029, and this feature gives it its strength and one line.
  What the filter shows comes later. The other way is to move the upgrade to another case in
  the world data, which `world.md` §1 allows.
- **The words** — the saying, the answer, "afterwards", the outcome, the block, the three
  hints, the line about the lamp and the intern's last page — as in the table. `Personal` is
  the room's name in the German journal.
- **Pages on the policy tab,** three blocks to a page, with the mark above the first block.
  The walk reaches the second page only with all four cases solved; its two steps may be
  skipped, and the tests hold them.
