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
`docs/features/0015-the-moving-floor.md` are the routes until the art pass.

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
- **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
  over the game from seller to advisor. As advisor he supplies the approved alternatives that
  solve the later cases.
- **The intern.** Sits in the break room, knows everything, likes to say it. This is the hint
  system in diegetic form: a player who is stuck goes to the break room. For a game played at home
  without a walkthrough, this matters more than it sounds.
- **The works council.** Not a global character but part of the HR case. Nothing moves there
  without him, and he is the one who asks about fairness. A German specific that gives the case
  depth.
- **Per department, three to five figures.** The source, the head of department, two or three
  colleagues with hints and everyday lines.
  The colleagues of the reception, Marketing, Support and Sales walk the floor since feature
  0015, without a name and without a line; their lines come with M4.
- **The managing director.** The last case.
- **The customer.** A voice on the phone at the start. One line in the epilogue: he called again.

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
stand on the floor: one in the east corridor in front of the Sales doorway, two in Sales. Its displayed name and its journal text are fixed with the journal (M4), the name
check of §5 included.

## 5. Names

Every product, company and tool in the game is fictional. Before a name is fixed in the world data
it is checked against real trademarks and products; a name that exists, or is a thin disguise of
one that exists, is not used. Domains and mail addresses in the game use reserved example domains.
The company itself has no name that resembles a real one, and never the author's own employer.
