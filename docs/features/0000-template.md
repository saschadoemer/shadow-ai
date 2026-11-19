# 0000 — Template

**Status:** draft | approved YYYY-MM-DD | implemented YYYY-MM-DD | rejected YYYY-MM-DD
**Milestone:** Mn
**Drafted:** YYYY-MM-DD

## Goal

What the player can do after this feature that they could not do before, in two or three
sentences. If the goal needs more, the feature is two features.

## Scope

**In:** the list of what this feature delivers.

**Out, explicitly:** what somebody would reasonably expect to be part of this and is not — each
with the feature or milestone where it belongs instead.

## Behaviour

The exact behaviour, with numbers. Speeds, sizes, timings, limits. Which spec sections this
refines. Edge cases named: what happens at the map border, when two keys are held, when the tab
loses focus.

## Acceptance criteria

Numbered, each one testable by a test or by a person following a step. Written so that a failure
is reported as "criterion 4", not as an interpretation.

## Test plan

Which unit tests, which architecture or asset tests, what the smoke test asserts. Which fixtures
are added under `tests/fixtures/`.

## Acceptance plan (the walk)

The walk the agent plays in a browser, by simulated key presses, after the implementation is
complete and before the pull request is opened. Written for a person at the keyboard, so that
the author can take it by hand as well, and so that a failure is reported as "step 7", not as
an impression. The rules are in `docs/spec/testing.md` §5. The `Result` line is filled in by
the agent: `passed YYYY-MM-DD, steps 1–n, played by the agent`, then the feel notes from the
author's answers.

**Preconditions:** how to start (`npm run dev` or the container), which browser, which window
size, where in the game to begin.

**Steps:** one flat numbered list. An action step says what to press or do, in the words of the
keys and the screen. Every expected result is its own numbered step, never a parenthesis on the
action step.

1. Start …
2. Expected: …

**Feel:** the few things only a player notices, as questions with room for a number or a note.

**Result:** not yet walked.

## Open questions

Anything unsettled. A spec with open questions is not approved; the questions are answered in
conversation and this section is emptied before the status changes.
