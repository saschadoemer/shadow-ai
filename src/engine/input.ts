/**
 * The keyboard (architecture.md §4): which physical keys are down, by KeyboardEvent.code, so W
 * is W on QWERTZ and on QWERTY. A repeated keydown changes nothing — that matters after
 * releaseAll: a key still held when the page regains focus keeps repeating and must not press
 * itself again. The edge ("went down this step") is not here yet; the lamp (M3) brings it.
 */

export interface Keyboard {
  /** The codes down right now. Live: read it once per frame, do not keep it. */
  readonly held: ReadonlySet<string>;
  /** A keydown; one with `repeat` changes nothing. */
  keyDown(event: { readonly code: string; readonly repeat: boolean }): void;
  keyUp(event: { readonly code: string }): void;
  /** On blur and when the page is hidden: no keyup will come for what is held. */
  releaseAll(): void;
}

export function createKeyboard(): Keyboard {
  const held = new Set<string>();
  return {
    held,
    keyDown(event) {
      if (!event.repeat) {
        held.add(event.code);
      }
    },
    keyUp(event) {
      held.delete(event.code);
    },
    releaseAll() {
      held.clear();
    },
  };
}

/** Feeds a window's keydown, keyup and blur and its document's visibilitychange into the keyboard. */
export function listenToKeyboard(keyboard: Keyboard, target: Window): void {
  target.addEventListener('keydown', (event) => keyboard.keyDown(event));
  target.addEventListener('keyup', (event) => keyboard.keyUp(event));
  target.addEventListener('blur', () => keyboard.releaseAll());
  target.document.addEventListener('visibilitychange', () => {
    if (target.document.visibilityState === 'hidden') {
      keyboard.releaseAll();
    }
  });
}

/** Keys per action, by KeyboardEvent.code. The table itself lives in main.ts. */
export type Bindings<A extends string> = Readonly<Record<A, readonly string[]>>;

/** An action is on when any of its keys is down. Pure. */
export function resolveActions<A extends string>(
  held: ReadonlySet<string>,
  bindings: Bindings<A>,
): Readonly<Record<A, boolean>> {
  const actions: Partial<Record<A, boolean>> = {};
  // Object.keys is typed string[]; the cast narrows it to the table's own keys.
  for (const action of Object.keys(bindings) as A[]) {
    actions[action] = bindings[action].some((code) => held.has(code));
  }
  return actions as Record<A, boolean>;
}
