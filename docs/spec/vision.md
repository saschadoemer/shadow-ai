# Vision — Shadow AI

What the game is, why it exists, and the few things that are true in every scene. Everything else
in `docs/spec/` serves this file. When a feature, a line of dialogue or a piece of art does not fit
here, the feature is wrong, not the vision — unless this file is changed first.

## 1. In one paragraph

Shadow AI is a browser game with pixel-art 2D graphics in the tradition of early top-down
adventures (The Legend of Zelda, Ocean's Heart). You are the head of IT at a mid-sized company.
All over the building people use AI tools nobody approved — not out of malice, but because the
tools fill gaps nobody else fills. Where data leaves the house unseen, a shadow remains. At first
only you can see it. You walk the campus, find traces, talk to people, and bring the shadow into
the light.

## 2. Why it exists

Two purposes, in this order:

1. **A conversation opener for customers and trade fairs.** At a booth the game is a teaser: the
   first act, about fifteen minutes, played standing up by somebody who has never seen it. It has
   to be readable without a word of tutorial text, look polished at first sight, and show a
   situation the visitor recognizes from their own company within the first minutes.
2. **A game people play at home afterwards.** Two to three hours in total, distributed as a
   public URL after the fair. It has to carry a real story arc, reward exploration, and let the
   player stop and come back.

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
  Sales is solved, the region clears, the campus opens. This act is the trade-fair teaser.
- *Act 2 — The cases.* About a hundred to a hundred and twenty minutes. The courtyard is the hub,
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
  watches the shadow lift from the whole campus. Colour everywhere.

**The vendor.** A sales representative of a fictional AI company, charming, recurring, always
already there when you arrive in a department. Never an enemy. He sells what fills real gaps and
knows it. Over the game he changes: he sees what his tools do, and he becomes an advisor who
helps you solve problems he helped cause. At the end he stands at your side. What was sold in the
shadow becomes a partnership in the light.

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
- Real company or product names, or thin disguises of them.
- Threats, warnings, consequences for a person.
- Jokes that need the player to know the industry.

## 7. Language

German first, English second. Both complete before distribution. Every visible string goes
through a key and a language table from the first line of text; no literal text in code. The
language is switched on the title screen. Code, comments, documentation and asset names are
English.

## 8. Non-goals of the vision

Considered and deliberately cut. A feature that needs one of these stops and asks.

No quiz · no compliance training, no certificate · no real product or company names · no
multiplayer · no mobile or touch version · no money, no shop · no character editor · no analytics,
no accounts · no morality system or branching case outcomes in the first draft (see
`docs/plan.md`, deferred) · no speaking hero.

## 9. Title and licence

The title is **Shadow AI** — the term the audience knows and searches for, and it works in both
languages. A subtitle may come later.

The repository is public. Code is licensed under MIT. Art, maps and texts are licensed separately
so that the game cannot be re-skinned and sold; CC BY-NC 4.0 is the proposal. The licence texts
and their split have to be checked by a competent person before the first public release.
