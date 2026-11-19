# World — Shadow AI

The floor, its regions, the cases, the cast and the creatures. The rules of the world are here;
how a map file is built lives in `gameplay.md` and the feature specs.

## 1. The floor

The overworld is one floor of the company's office building, seen from above like a Zelda
overworld: an outer wall with windows, a ring of four corridors round a core, and every department
as a room behind thin walls with a doorway. Management on the top floor and the server room in the
basement are their own maps, reached later through the lift and the stairwell in the core; both
are closed today. The floor is built coarsely first — corridors, rooms, walls, doorways — and
furnished and detailed region by region.

**The map as built** (feature 0010): 108x80 tiles, 1728x1280 px, in placeholder tiles, generated
from `tools/floor-layout.ts` until the art pass. Along the north wall lie HR, Accounting and
Development, and past Development a side passage leads up to two meeting rooms. On the west side
the data protection officer's office sits above the reception; the core between the west and the
east corridor holds the break room, the closed lift and the closed stairwell, and Sales fills the
east side. Marketing and Support share the south side. Walls are strips 4 px thick, doorways three
tiles wide, corridors six. The player starts in the reception. The tables in
`docs/features/0010-the-floor.md` are the layout until the art pass. The figure wakes in the data
protection officer's office, at the map's `wake` point, tile (18, 31) (features 0009, 0010).

**The furniture** (feature 0011) tells the rooms apart. Sales, Support and Development are rows of
cubicles, each a desk with a monitor and a chair behind low partitions, with aisles three tiles
wide between the rows. HR, Accounting and the data protection officer's office have single desks
with a chair, a mobile screen and a row of cabinets; HR and the office also have a small table,
Accounting a printer. Marketing has desk islands of four, with a mobile screen between the two
islands of each pair, cabinets and a printer. The reception has a white counter with a chair
behind it and plants in its corners. The break room has a long counter along its north wall and
four small tables with two chairs each. Each meeting room has one long table with four chairs.
Each wide corridor has a printer and two plants. The lift, the stairwell, the west and east
corridors and the side passage stay empty. The tables in `docs/features/0011-the-furniture.md`
are the placement until the art pass.

**The lounge and the gadgets** (feature 0013) make the floor lived in. Every room has a coat rack
near its entrance and somewhere to sit that is not a desk chair — a sofa with a small table and an
armchair, a pair of armchairs, or beanbags round a small table. Accounting, Development, Sales,
Support, Marketing and the north meeting room have a coffee machine on a short counter. The break
room has two machines on its long counter, a water dispenser, a seating corner, beanbags, a table
football and an arcade cabinet. Sales and Support have a water dispenser, and so has each of the
two wide corridors; the south corridor also has a sofa between the lift and the stairwell. Eight
desks in Development carry a gadget — a duck, a lava lamp, a colour cube, a toy robot. The lift,
the stairwell, the west and east corridors and the side passage stay empty. The tables in
`docs/features/0013-lounge-and-gadgets.md` are the placement until the art pass.

**What moves** (feature 0015). The floor is not empty between the cases. Four colleagues walk
between their desk and a printer, a coat rack or the coffee — in the reception, Marketing, Support
and Sales. Each of the eight rooms has an office dog that circles its seating corner (in
Development it walks along the sofa) and a robot vacuum that drives two lanes. Two drones fly
rectangles over the desks of Development and Marketing. Every mover follows a fixed route of two
to four points and waits a pause at each; there is no random wandering and no path finding, and no
mover leaves its room. Nothing that moves is solid: the figure, the creatures and the light pass
through it. A colleague, a dog or a vacuum stands while the figure's feet are closer than 20 px;
a drone flies on. The routes live in the map's `objects` layer; the tables in
`docs/features/0015-the-moving-floor.md` are the routes until the art pass. Since feature 0018
the four colleagues can be spoken to, and stop where they are while they speak.

| Region | Role |
|---|---|
| Reception | The hub. The player starts here; the data protection officer's office is next door, the ring of corridors leads to every department. |
| Sales | Act 1. The first case, the first creature, the first cleared region. |
| Marketing | Act 2, open from the start. |
| Support | Act 2, open from the start. |
| HR | Act 2, after the first lamp upgrade. |
| Accounting | Act 2, after the first lamp upgrade. |
| Development | Act 2, after the second lamp upgrade. |
| Management (top floor, through the lift) | Act 2, the last case. Needs the filter and the vendor as advisor. |
| Meeting rooms | Side case: the meeting bot. Found, not on the way: off a side passage. |
| Break room | Rumours and hints. The intern sits here. |
| Server room (basement, through the stairwell) | The dungeon. Entered with the keycard from Management. The core sits at its end. |

**Shadow density.** Every region has a density. Density against light strength is the one gating
rule of the game (`gameplay.md` §5): a thin shadow wall gives way to the basic lamp, a dense one
only to an upgrade. Densities are set once, in the world data, and tested for consistency: no
region may require an upgrade that cannot be earned before it.

**As built** (feature 0014): the densities of the floor, in `src/game/world.ts`. The data
protection officer's office and the corridors are no regions and have no shadow. Management and
the server room join the table with their maps.

| Region | Density |
|---|---|
| Reception | 0 |
| Break room | 0 |
| Sales | 1 |
| Marketing | 1 |
| Support | 1 |
| Meeting rooms | 1 |
| HR | 2 |
| Accounting | 2 |
| Development | 3 |

Eight shadow walls close the doorways of the regions under shadow. Each is a rectangle named
`shadow:<region>` in the map's `objects` layer, a strip 4 px thick exactly where the doorway's
wall strip is missing; the meeting rooms have one in each of their two doorways.

| Wall | Doorway cells | Density | Lit from |
|---|---|---|---|
| `shadow:sales` | (79, 37)–(79, 39) | 1 | the east corridor |
| `shadow:marketing` | (23, 58)–(25, 58) | 1 | the south corridor |
| `shadow:support` | (77, 58)–(79, 58) | 1 | the south corridor |
| `shadow:meeting-rooms` | (89, 4)–(89, 6) | 1 | the side passage |
| `shadow:meeting-rooms` | (89, 14)–(89, 16) | 1 | the side passage |
| `shadow:hr` | (10, 20)–(12, 20) | 2 | the north corridor |
| `shadow:accounting` | (31, 20)–(33, 20) | 2 | the north corridor |
| `shadow:development` | (63, 20)–(65, 20) | 3 | the north corridor |

The openings of the reception, the data protection officer's office, the break room and the side
passage stay open. With the basic lamp the player lifts the walls of density 1 and enters Sales,
Marketing, Support and both meeting rooms; HR, Accounting and Development can be seen but stay
closed until the upgrades of M6. The two upgrades that gate the floor are earned in this order:
the wider cone in Marketing (strength 2), the colour filter in HR (strength 3). A case spec of M6
may move either; the gating test then guards the new place.

**As built** (feature 0029): the case of Marketing earns the wider cone. With it the walls of
HR and Accounting are lifted like the thin ones, and the player enters both rooms; they are
under their shadow and have nothing of their own until their cases come. The wall of
Development holds until the colour filter.

**As built** (feature 0023): every region of the floor has an area in the map — a rectangle
named `region:<id>` in the `objects` layer that covers its room as the layout knows it, with its
upper and its left wall. The meeting rooms have two areas, one per room. A room whose region has
a density above 0 is under shadow and is drawn so (`visual.md` §4); the reception and the break
room are not. The corridors, the side passage, the lift, the stairwell and the data protection
officer's office are no regions and have no area. Lifting the shadow wall of a doorway does not
change the room behind it: the wall was the door, not the shadow.

**As built** (feature 0025): a region whose case is solved is **cleared**, for good. Its cells
are no longer under shadow, whatever its density in the table: the density stays what gates the
region, and the solved case is what takes the shadow off it. Sales is the first cleared region;
every other region with a density above 0 stays under shadow until its case is solved.

**As built** (feature 0027): every coffee machine of the floor is a **rest** — a rectangle named
`rest:coffee` in the `objects` layer, on the cell of the machine. There are eight: one in the
meeting room north (104, 8), one in Accounting (27, 19), one in Development (52, 19), two in the
break room (35, 26) and (42, 26), one in Sales (104, 26), one in Marketing (12, 78) and one in
Support (52, 78). A rest fills overview where its cell is not under shadow (`gameplay.md` §4):
at the start the two of the break room, after the case of Sales the one of Sales too. The
water dispensers, the sofas and the table football are no rests.

| Area | Cells | Density |
|---|---|---|
| `region:hr` | (1, 1)–(21, 19) | 2 |
| `region:accounting` | (22, 1)–(43, 19) | 2 |
| `region:development` | (44, 1)–(84, 19) | 3 |
| `region:meeting-rooms` | (89, 1)–(106, 9) | 1 |
| `region:meeting-rooms` | (89, 10)–(106, 19) | 1 |
| `region:reception` | (1, 38)–(22, 51) | 0 |
| `region:break-room` | (29, 26)–(48, 51) | 0 |
| `region:sales` | (79, 26)–(106, 51) | 1 |
| `region:marketing` | (1, 58)–(48, 78) | 1 |
| `region:support` | (49, 58)–(106, 78) | 1 |

## 2. The cases

Seven department cases and one side case. Each needs a pattern the visitor recognizes from their
own company, one creature species, and one building block of the AI policy.

| Region | The pattern | The policy block |
|---|---|---|
| Sales *(Act 1)* | Offer texts pasted into a public chatbot to "polish" them — the customer's offer that started everything | Which data may go where: classification |
| Marketing | An image generator delivers visuals with other companies' brands and faces; generated posts claim things that are not true | Generated content is reviewed before it goes out |
| Support | Customer mails with names and addresses pasted into a translator; a browser extension reads the mailbox | Approved tools and extensions — and only those |
| HR | A tool pre-sorts applications and nobody knows by what | No automated decision about people without a person |
| Accounting | Invoices and bank data uploaded to be categorized — and forty-seven small subscriptions on the company card | Tools are procured, not subscribed to: the inventory |
| Development | API keys and customer data in the prompt of a code assistant; proprietary code in public models | Secrets never go into a prompt |
| Management *(last case)* | Strategy papers and board documents in a private account — the densest shadow in the house | Responsibility: the policy has an owner, and the owner sits at the top |
| Meeting rooms *(side case)* | An AI note-taker somebody invites to every meeting records everything, including the confidential ones | Whoever records says so beforehand |

**Traces of Sales** (feature 0022): five traces lie on the screens of five of the sixteen cubicle
desks of Sales, at least one in every row of four. The table of `docs/features/0022-traces.md`
is the placement until the art pass.

**The case of Sales** (feature 0024): the case is solved by the talk with its source once its
five traces are found. Its policy block, in the words of `docs/features/0024-the-case-of-sales.md`:
every text has a level — open, internal or confidential; confidential text stays in tools we
have approved; whoever is unsure asks, without trouble.

**Traces of Marketing** (feature 0028): five traces lie on four of the sixteen screens of the
desk islands of Marketing — three in the upper row, one in the lower — and on the printer at
the room's lower wall. The table of `docs/features/0028-the-case-of-marketing.md` is the
placement until the art pass.

**The case of Marketing** (feature 0028): the second case, by the rules of the first. An image
generator makes the visuals, other companies' logos and faces are in them, and nobody looked
before they went to print. Its policy block, in the words of
`docs/features/0028-the-case-of-marketing.md`: what a machine has made, a person looks at
before it leaves the house — image or text, rather once too often. The two cases do not depend
on each other: the player may solve Marketing before Sales.

**Order and gating.** Marketing and Support are open from the start (thin shadow). HR and
Accounting open after the first upgrade, Development after the second. Management is last: without
the filter nothing is visible there, and without the vendor as advisor there is no alternative
that convinces the managing director. The server room is not a case; it is the dungeon behind the
last one.

## 3. The cast

Kept as small as the story allows. About thirty figures in all.

- **The data protection officer.** Mentor. Office beside the reception, which is also where the
  player wakes up after losing overview. The only person besides the player who sees the shadow
  from the start. Gives the lamp and explains the rules of the world in three sentences.
  Since feature 0017 she stands in her office at tile (16, 29), two tiles from the wake point,
  and can be spoken to. She says the three sentences that explain the shadow and the lamp, the
  same two pages every time, until M5 brings the first meeting. She has no name yet and is not
  solid: the player walks through her. Feature 0018 changed nothing for her but the distance
  from which she can be spoken to: 40 px, and in sight.
  Feature 0026 brings the first meeting: while the player has no lamp she says her first page
  and then `Nimm die Lampe: …` — three sentences in all — and the press that closes it hands
  the lamp over. From then on she says the two pages of 0017.
- **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
  over the game from seller to advisor. As advisor he supplies the approved alternatives that
  solve the later cases. They are fictional products; Harmonic is not his (`vision.md` §10).
- **The intern.** Sits in the break room, knows everything, likes to say it. This is the hint
  system in diegetic form: a player who is stuck goes to the break room. For a game played at home
  without a walkthrough, this matters more than it sounds.
  *As built* (feature 0033): he stands, until the art pass gives him a chair — in the middle
  of tile (38, 30), four tiles below the counter of the break room, in a blue shirt. He says one
  page, picked from how far the player has come: before the lamp, that the data protection
  officer has something; per case where the room is, what to look at, and whom to ask; and at
  the end that he knows no more. The cases are asked in their order, Sales first, whatever the
  player has begun. He does not see the shadow and never speaks of it: he speaks of rooms,
  screens, the printer and shirts. Nothing is shown unasked — no arrow, no marker.
- **The works council.** Not a global character but part of the HR case. Nothing moves there
  without him, and he is the one who asks about fairness. A German specific that gives the case
  depth.
- **Per department, three to five figures.** The source, the head of department, two or three
  colleagues with hints and everyday lines.
  The colleagues of the reception, Marketing, Support and Sales walk the floor since feature
  0015. Since feature 0018 each has one everyday saying; they still have no name.
  Since feature 0024 the colleague of Sales is the source of the first case. What the colleague
  says follows from the case: the everyday line while a trace is missing, the honest answer
  once all five are found, and the line afterwards once the case is solved.
  Since feature 0028 the colleague of Marketing — the one in the red shirt, with the printer —
  is the source of the second case, by the same rule.
- **The managing director.** The last case. In the first act a sentence of the call (feature
  0026); a figure with the map of Management (M6).
- **The customer.** A voice on the phone at the start — one sentence of the call (feature 0026).
  One line in the epilogue: he called again.

## 4. The creatures

One species per case, two or three more for the server room: eight to ten species in all. Each
species:

- lives where a specific kind of tool use happens, and looks like what it feeds on;
- has a weakness that corresponds to a real countermeasure, stated in its journal entry in plain
  words;
- belongs to one of the three layers (`gameplay.md` §3): small ones give way to the lamp, medium
  ones need an action in the environment, the source of a case gives way only to the conversation.

Species names, looks and behaviours are defined in the feature spec that introduces them.

**The snippet** (*Schnipsel*, feature 0008) is the species of the Sales case: a scrap of paper
with lines of text, because it feeds on text pasted into a public chatbot. Small, layer 1. Three
stand on the floor: one in the east corridor in front of the Sales doorway, two in Sales. The
two of Sales have their home in the region's area and leave the game when the case of Sales is
solved, captured or not; the one of the corridor has its home in no region and stays (feature
0025). Its displayed name is *Schnipsel*, in English
*Snippet*, and its journal text is fixed with feature 0020: what it is, what it lives on, and
that it goes as soon as everyone knows which data may go where. The name is a dictionary word
for a scrap of paper, used for a species and not for a product, a company or a tool; it is fixed
by the author's decision on that basis, and no trademark register was searched (§5).

**The mirage** (*Trugbild*, feature 0032) is the species of the Marketing case: a small framed
portrait of nobody, because it feeds on pictures a machine made and nobody checked. Small,
layer 1. It moves only while nobody looks at it: looked at, it stands; not looked at, it comes
at the figure from as far as six tiles, faster than a snippet. The lamp freezes and captures it
like every creature. Its weakness is the countermeasure of its case — somebody looks. Three
stand in Marketing, on the cells (10, 67), (38, 65) and (22, 75): none near the doorway, and
placed so that one comes from behind while the player looks at a screen of the lower row or at
the printer. All three have their home in the region's area and leave the game when the case of
Marketing is solved (feature 0025). Its displayed name is *Trugbild*, in English *Mirage*:
dictionary words for a false picture, used for a species and not for a product; fixed by the
author's decision on that basis, and no trademark register was searched (§5).

## 5. Names

Every product, company and tool in the game is fictional, with two exceptions: LMIS, which
presents the game, and Harmonic. Each is a name on one carpet (§6, `vision.md` §10). Before any other
name is fixed in the world data it is checked against real trademarks and products; a name that
exists, or is a thin disguise of one that exists, is not used. Domains and mail addresses in the
game use reserved example domains. The company in the game has no name that resembles a real
one, and it is never LMIS: LMIS presents the game, and its carpet is a presenter's sign, not
the name of the house.

## 6. The carpets

Two carpets carry a name (`vision.md` §10). Each lies in a corridor, on cells of corridor floor
with no wall strip and no furniture, and in no area of a region: the corridors are not under
shadow (`visual.md` §4), so a carpet always shows its colours. A carpet is floor; nothing in
the play knows it.

- **LMIS.** In the west corridor, in front of the opening of the reception: the first steps of
  every game lead over it.
- **Harmonic.** In the east corridor, below the doorway of Sales: in view of everybody who
  walks into the first case.

The cells are fixed in the feature that builds them. A further carpet is a number in the
budget first (`docs/plan.md` §3).
