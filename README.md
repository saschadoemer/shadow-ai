# Shadow AI

A browser game in pixel-art 2D, in the tradition of early top-down adventures, about shadow AI
in a mid-sized company. You are the head of IT. All over the building people use AI tools nobody
approved — because the tools fill gaps nobody else fills. Where data leaves the house unseen, a
shadow remains that at first only you can see. Your weapon is a lamp. Creatures are captured and
understood, never killed.

The game is a two-to-three hour browser game to play at home, and afterwards a conversation
opener for customers and trade fairs. German first, English second.

## Status

Early. The toolchain is in place (feature 0001), the surface and the loop run (feature 0002),
and the game shows a tile map (feature 0003): a test map authored in Tiled, drawn from generated
placeholder tiles, scaled by whole factors in device pixels, with `F` for fullscreen. The figure
walks on it (feature 0004): arrow keys or WASD, eight directions, a generated placeholder with a
walk cycle. Walls stop it, and it slides along them (feature 0005). The camera follows the
figure over the map (feature 0006), and M2 is complete. The lamp shines (feature 0007): hold
`Space` and a cone of light appears in front of the figure; the direction keys turn it. The
first creature is here (feature 0008): snippets come toward the figure, freeze in the light and
are captured after one second. A snippet's touch costs one point of overview and pushes the
figure back; at zero the figure wakes in the data protection officer's office (feature 0009).
The figure starts with five points, shown as five hearts in the corner (feature 0012). The world is one office floor (feature 0010): 108x80 tiles, a ring of corridors
round a core, every department a room behind walls 4 px thin. The floor is furnished (feature
0011): cubicles, desks, cabinets, plants, tables, counters, printers and mobile screens; the
lamp shines over everything lower than a person. The floor is lived in (feature 0013): sofas,
armchairs, beanbags, coffee machines, water dispensers, coat racks, a table football, an arcade
cabinet and a few gadgets on desks. The floor moves (feature 0015): four colleagues, a dog and a
robot vacuum in every room and two drones follow fixed routes; they block nothing, and the ones
on the ground stand while the figure is close. Shadow walls close the doorways of the regions
under shadow (feature 0014): the lamp lifts the thin ones in a second, the dense ones hold until
the lamp is stronger. The game shows its first text (feature 0016): a wall that holds against
the lamp says so in one line, in the game's own pixel font, from a language table in German and
English. The data protection officer stands in her office beside the reception and can be
spoken to with `E` or `Enter` (feature 0017): a box shows what she says, page by page, and the
world stands still while it is open. The four colleagues who walk the floor can be spoken to as
well, across the counter too, and each has a saying (feature 0018). `L` switches the game between
German and English at any moment (feature 0019). `J` opens the journal with its three tabs;
a captured snippet has its entry there (feature 0020). `H` opens the help, a box that lists
every key, and for the first ten seconds a line at the bottom names it (feature 0021).
Milestones M3 and M4 are complete, and M5, the first act, has begun: the lamp finds traces on
the screens of Sales, and the journal counts them on its cases tab (feature 0022). The regions
under shadow are drawn darker, without colour and under a violet veil whose density is the
region's (feature 0023). With all five traces found, the colleague of Sales answers honestly,
the case is solved, the journal records its outcome and the first block of the policy, and
overview grows by one (feature 0024). In the same moment the room gets its colours back, its
veil thins out over two seconds, and its shadow wall and the snippets that were left in it are
gone (feature 0025). The game opens with the call — three pages of story — and without the
lamp: the data protection officer next door hands it over in the first talk (feature 0026).
Every merge to `main` is deployed to Cloud Run (feature 0030). The roadmap is in
[docs/plan.md](docs/plan.md).

## Run it

Node 26 (see `.nvmrc`) and, for the container, Docker.

```
npm ci
npm run dev          # the dev server at http://localhost:5173
npm run check        # typecheck, lint, build and the headless tests
npm run test:e2e     # the smoke test against the dev server
npm run gen-tiles    # regenerate the placeholder tiles under public/tiles/
npm run gen-sprites  # regenerate the placeholder figure, the lamp, snippet, overview, movers', shadow-wall, font and officer sheets under public/sprites/
npm run gen-floor    # regenerate the floor map with its creatures and the wake point under public/maps/
```

Maps are edited in [Tiled](https://www.mapeditor.org/) 1.10 or newer. The floor,
`public/maps/floor.tmj`, is generated until the art pass: change `tools/floor-layout.ts`, run
`npm run gen-floor`, reload the page. It opens in Tiled for looking; a save there reformats the
file and fails the generator test.

The container is what ships — static files behind nginx on port 8080:

```
docker build -t shadow-ai .
docker run --rm -p 8080:8080 shadow-ai      # http://localhost:8080
BASE_URL=http://localhost:8080 npm run test:e2e
```

Every merge to `main` is deployed by the workflow. A new Google Cloud project is prepared
once; a deployment by hand uses the script the workflow uses:

```
tools/gcp-bootstrap.sh <project-id>      # once: registry, keyless login, accounts, budget, repository variables
docker build --platform linux/amd64 -t shadow-ai .
GCP_PROJECT_ID=<project-id> GCP_REGION=europe-west1 tools/gcp-deploy.sh shadow-ai <tag>
```

What they create and what it costs is in [docs/spec/ops.md](docs/spec/ops.md) §5.

## How it is built

Spec-first, feature by feature, with AI agents working from the specification. Nothing is built
that was not approved first.

| Where | What |
|---|---|
| [CLAUDE.md](CLAUDE.md) | the root of the specification: what the game is, the hard invariants, the feature workflow, the non-goals |
| [docs/spec/](docs/spec/) | one file per area: vision, world, gameplay, visual, architecture, ops, testing |
| [docs/plan.md](docs/plan.md) | roadmap, content budget, deferred ideas |
| [docs/features/](docs/features/) | one spec per feature, with its status |
| [docs/adr/](docs/adr/) | architecture decision records |
| `src/`, `public/`, `tools/`, `tests/` | the code and what the game loads — kept strictly apart from `docs/` |

TypeScript, Canvas 2D, Vite, Vitest — and no game framework, for the reasons in
[ADR-0001](docs/adr/0001-own-engine-on-canvas-2d.md). The deliverable is a container that serves
static files.

## Licence

Code is licensed under the [MIT License](LICENSE). Art, maps and texts will carry a separate
licence, fixed before the first public release; the proposal is CC BY-NC 4.0.
