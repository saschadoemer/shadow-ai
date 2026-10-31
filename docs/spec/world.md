# World — Shadow AI

The campus, its regions, the cases, the cast and the creatures. The rules of the world are here;
how a map file is built lives in `gameplay.md` and the feature specs.

## 1. The campus

The overworld is the company's grounds, seen from above like a Zelda overworld: one large,
connected outdoor map. Buildings are entered through transitions into their own maps (interiors
are later features; in the first stage the buildings are closed). The campus is built coarsely
first — paths, building footprints, fences, parking, green — and detailed region by region.

| Region | Role |
|---|---|
| Courtyard | The hub. Reception, the data protection officer's office (where the player wakes up after losing overview), paths to every department. |
| Sales | Act 1. The first case, the first creature, the first cleared region. |
| Marketing | Act 2, open from the start. |
| Support | Act 2, open from the start. |
| HR | Act 2, after the first lamp upgrade. |
| Accounting | Act 2, after the first lamp upgrade. |
| Development | Act 2, after the second lamp upgrade. |
| Management (top floor) | Act 2, the last case. Needs the filter and the vendor as advisor. |
| Meeting rooms | Side case: the meeting bot. Found, not on the way. |
| Canteen | Rumours and hints. The intern sits here. |
| Parking lot | Outdoor region, boundary and atmosphere. |
| Server room (basement) | The dungeon. Entered with the keycard from Management. The core sits at its end. |

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

- **The data protection officer.** Mentor. Office on the courtyard, which is also where the player
  wakes up after losing overview. The only person besides the player who sees the shadow from the
  start. Gives the lamp and explains the rules of the world in three sentences.
- **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
  over the game from seller to advisor. As advisor he supplies the approved alternatives that
  solve the later cases.
- **The intern.** Sits in the canteen, knows everything, likes to say it. This is the hint system
  in diegetic form: a player who is stuck goes to the canteen. For a game played at home without a
  walkthrough, this matters more than it sounds.
- **The works council.** Not a global character but part of the HR case. Nothing moves there
  without him, and he is the one who asks about fairness. A German specific that gives the case
  depth.
- **Per department, three to five figures.** The source, the head of department, two or three
  colleagues with hints and everyday lines.
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

## 5. Names

Every product, company and tool in the game is fictional. Before a name is fixed in the world data
it is checked against real trademarks and products; a name that exists, or is a thin disguise of
one that exists, is not used. Domains and mail addresses in the game use reserved example domains.
The company itself has no name that resembles a real one, and never the author's own employer.
