# Vision — Shadow AI

What the game is, why it exists, and the few things that are true in every scene. Everything else
in `docs/spec/` serves this file. When a feature, a line of dialogue or a piece of art does not fit
here, the feature is wrong, not the vision — unless this file is changed first.

## 1. In one paragraph

Shadow AI is a browser game with pixel-art 2D graphics in the tradition of early top-down
adventures (The Legend of Zelda, Ocean's Heart). You are the head of IT at a mid-sized company.
All over the building people use AI tools nobody approved — not out of malice, but because the
tools fill gaps nobody else fills. Where data leaves the house unseen, a shadow remains. At first
only you can see it. You walk the floor, find traces, talk to people, and bring the shadow into
the light.

## 2. Why it exists

Two purposes, in this order:

1. **A game people play at home.** Two to three hours in total, distributed as a public URL and
   played in a desktop browser with a keyboard. It has to carry a real story arc, reward
   exploration, and let the player stop and come back. This is the first use, and where a
   decision serves only one of the two purposes, this one wins.
2. **A conversation opener for customers and trade fairs, afterwards.** At a booth the game is a
   teaser: the first act, about fifteen minutes, played standing up by somebody who has never
   seen it. It has to be readable without a word of tutorial text, look polished at first sight,
   and show a situation the visitor recognizes from their own company within the first minutes.
   Tutorial text is text that explains the game: what the shadow is, what the lamp is for, what
   to do next. The game has none. The help (feature 0021) is not tutorial text: a list of keys
   the player calls up, and one line at the start that names its key. It says which key does
   what, and nothing about why. The line that names the lamp's key when the lamp is handed
   over (feature 0026) is of the same kind.

The game is presented by LMIS, and one real product stands in its world: Harmonic (§10). Both
serve the second purpose and are bound by the order above. Where they pull against the game
people play at home, the game wins.

And a third, quietly: a project the author enjoys building. That is allowed to show.

## 3. The message

> The enemy is not the colleague who uses a tool. The enemy is the shadow — the absence of safe,
> approved ways. You do not win by forbidding. You win by making the shadow unnecessary.

Every case, every line of dialogue and every creature description is checked against this
sentence. The game never punishes an employee, never shows IT as the police, and never ends a
case with somebody getting into trouble.

## 4. The story

**Premise.** You are the head of IT of a mid-sized company. Nobody in the building is a villain.
Everybody wants to get their work done faster.

**Trigger.** Monday morning. A customer calls: he has recognized wording from his own confidential
offer in the answer of a public AI chatbot. The managing director stands in your door: find out
how that could happen. On the way to Sales, where the offer came from, you see the shadow for the
first time.

*As built* (feature 0026): the trigger is three pages of text before the first step — the
customer's call, the managing director's order, the first sight of the shadow. The customer and
the managing director say one sentence each and are not on the map in the first act. The
managing director stops the player at the reception, where the game begins: the floor has no
room of the player's own, so nobody can stand in its door. The third page points next door, to
the data protection officer, who hands the lamp over in the first talk.

**The shadow.** A residue, not a being. Wherever data leaves the house without anybody watching,
something stays behind and grows with the flow. It darkens rooms, lies over screens, blocks
corridors like a wall of flicker. Where the use gets dense, it condenses into creatures — one
species per kind of tool, each with a weakness that corresponds to a real countermeasure. The
rules of the shadow:

- *Who sees it.* At the start only you, and the data protection officer, who becomes your mentor.
  With every solved case more colleagues see it. Awareness is literal: the progress of the game
  *is* how many people can see the shadow.
- *How it gives way.* A solved case lifts the shadow over that region for good. Colour returns.
  The player sees on the map what has already been brought into the light.

**Three acts.**

- *Act 1 — The call.* About fifteen minutes. The call, the walk to Sales, the first sight of the
  shadow. The data protection officer sees it too and gives you the lamp. The first small case in
  Sales is solved, the region clears, the floor opens. This act is the trade-fair teaser.
- *Act 2 — The cases.* About a hundred to a hundred and twenty minutes. The reception is the hub,
  the departments are the spokes. Six cases of fifteen to twenty minutes each, half open: two or
  three departments are reachable at any time, more open through lamp upgrades and two keys. Every
  case follows the same rhythm — find traces, investigate, talk, find the source, resolve — and
  ends the same way: the region clears, the journal grows, more colleagues see the shadow. In the
  middle a real dungeon: the server room in the basement, where the data flows meet and the
  creatures are dense. The last and hardest case is Management; solving it yields the keycard to
  the core.
- *Act 3 — The core.* About twenty-five minutes. Deep in the server room sits the condensed shadow
  of everything that was never resolved — the boss. When it is beaten it speaks, once, honestly:
  *"I was only there where you had nothing."* Then the epilogue in the all-hands meeting: the AI
  policy, assembled from the building blocks collected in the cases, is read out, and everybody
  watches the shadow lift from the whole floor. Colour everywhere.

**The vendor.** A sales representative of a fictional AI company, charming, recurring, always
already there when you arrive in a department. Never an enemy. He sells what fills real gaps and
knows it. Over the game he changes: he sees what his tools do, and he becomes an advisor who
helps you solve problems he helped cause. At the end he stands at your side. What was sold in the
shadow becomes a partnership in the light. He has no part in Harmonic (§10): his company is
fictional, the alternatives he supplies as advisor are fictional products, and nobody should
recognize LMIS in him.

**The hero.** Silent, like Link. No name, no character editor, a neutral 16x24 sprite with a
lanyard and a lamp. His attitude — *I am not here to punish anyone* — shows in what happens when
he acts: nobody is led away, somebody breathes out.

## 5. Design pillars

Five sentences that decide arguments. If two features conflict, the one that honours more of
these wins.

1. **Light understands.** The lamp is the weapon; creatures are captured into the journal, never
   killed. Combat and message are the same action.
2. **Everybody means well.** No villain among employees or management. Friction comes from the
   shadow and from the vendor's arc, never from a colleague being bad.
3. **The world shows progress.** Cleared regions regain colour; more people see the shadow. The
   player never needs a progress bar.
4. **Recognizable before clever.** Every case is a situation a visitor knows from their own
   company. Wit comes second.
5. **The game itself is clean.** No tracking, no cookies, no accounts, no network request at run
   time except to its own origin. A game about data protection that collects data loses every
   conversation at the booth.

## 6. Tone sheet

Dialogue and descriptions are written by many hands, some of them agents. This is the measure.

**It sounds like this:**

- Warm and dry. People are busy, friendly and a little tired.
- Humour comes from situations — the printer somebody "AI-optimized" — never from mocking a
  person.
- Short lines. Nobody gives a speech. The longest thing anyone says is three sentences.
- Colleagues explain *why* they used the tool before anybody asks whether they should have.
- Relief is the emotional note of a solved case, not triumph.

**Never like this:**

- Sarcasm about employees, their age, their department or their competence.
- Lecturing. No line that would fit on a compliance slide.
- Real company or product names, or thin disguises of them. LMIS and Harmonic are the two
  exceptions (§10).
- Praise for a product. Nobody recommends Harmonic, says what it costs or where to get it.
- Threats, warnings, consequences for a person.
- Jokes that need the player to know the industry.

## 7. Language

German first, English second. Both complete before distribution. Every visible string goes
through a key and a language table from the first line of text; no literal text in code. The
language is switched on the title screen; until the title screen exists (M8), `L` switches it
while playing (feature 0019). Code, comments, documentation and asset names are
English.

## 8. Non-goals of the vision

Considered and deliberately cut. A feature that needs one of these stops and asks.

No quiz · no compliance training, no certificate · no real product or company names beyond LMIS
and Harmonic (§10) · no multiplayer · no mobile or touch version · no money, no shop · no
character editor · no analytics, no accounts · no morality system or branching case outcomes in
the first draft (see `docs/plan.md`, deferred) · no speaking hero.

## 9. Title and licence

The title is **Shadow AI** — the term the audience knows and searches for, and it works in both
languages. A subtitle may come later.

The repository is public. Code is licensed under MIT. Art, maps and texts are licensed separately
so that the game cannot be re-skinned and sold; CC BY-NC 4.0 is the proposal. The names LMIS and
Harmonic belong to their owners and are covered by neither licence; the licence texts have to
say so. The licence texts and their split have to be checked by a competent person before the
first public release.

## 10. LMIS and Harmonic

Two real names are in the game, and only these two (§6, §8): **LMIS**, the author's employer,
which presents the game, and **Harmonic**, a safe AI workplace a company can approve for its
people. Harmonic is made by a partner of LMIS, and LMIS sells it. Its maker has agreed to the
name appearing in the game.

**LMIS is the frame, not the world.** The name stands where the game is presented: on the title
screen, as in `LMIS präsentiert`. The teaser is shown before the title screen exists (M8), so it
gets a place of its own for the line, decided in its feature. Any further place — an end card,
credits — is decided in the feature that builds it. LMIS is never the company in the game.
That company stays fictional (`world.md` §5): it is the house the data leaks from, and no real
company is put in that place.

**Harmonic is the approved way, made visible.** The message says the shadow gives way where it
becomes unnecessary (§3). A Harmonic station is a desk in a department where that has happened:
the people there have a safe way, so the creatures of the room have nothing left to feed on, and
they go. That is why a real product may stand in this world at all. It does not sit beside the
message; it is an instance of it. What a station does is `gameplay.md` §10. Where the stations
stand is `world.md` §6.

The rules both are held to:

- **Every player meets Harmonic once.** One station stands on the way through Sales in Act 1, so
  the visitor at the booth and the player at home both see the name and can use it.
- **It is rare.** Three stations in the whole game (`docs/plan.md` §3), each placed by hand.
  Nothing about Harmonic is left to chance.
- **It shortens a case and never solves one.** A station takes the fight out of a room. The
  traces and the conversation with the source stay the player's. A tool does not replace the
  talk between two people.
- **It is shown, not praised.** The player sees the effect, one dry line names the product, and
  the case in the journal carries a mark. No figure recommends Harmonic, says what it costs or
  where to get it (§6).
- **A name, not a logo.** Both names are written in the game's own font. No logo of either is
  drawn, so INV-6 needs no exception.
- **The vendor is somebody else** (§4). He does not sell Harmonic, and no station is his.
- **The advertising is recognizable.** The presenter's line tells a player that the product in
  the game is there on purpose. Whether that is enough has to be checked by a competent person
  before the first public release, together with the licences (§9).
