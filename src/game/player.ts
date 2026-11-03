/** The four movement actions, resolved by main.ts once per frame from the held keys. */
export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}
