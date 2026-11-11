import { describe, expect, it } from 'vitest';
import { type Bindings, createKeyboard, resolveActions } from '../../src/engine/input';

describe('the keyboard', () => {
  it('records a key going down and up by its code', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'KeyW', repeat: false });
    expect([...keyboard.held]).toStrictEqual(['KeyW']);
    keyboard.keyUp({ code: 'KeyW' });
    expect(keyboard.held.size).toBe(0);
  });

  it('holds several keys at once and releases them one by one', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'ArrowRight', repeat: false });
    keyboard.keyDown({ code: 'KeyW', repeat: false });
    expect([...keyboard.held].sort()).toStrictEqual(['ArrowRight', 'KeyW']);
    keyboard.keyUp({ code: 'ArrowRight' });
    expect([...keyboard.held]).toStrictEqual(['KeyW']);
  });

  it('ignores a repeated keydown, also for a key released by releaseAll', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect(keyboard.held.size).toBe(0);
    keyboard.keyDown({ code: 'KeyD', repeat: false });
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect([...keyboard.held]).toStrictEqual(['KeyD']);
    keyboard.releaseAll();
    // The OS keeps repeating a key that is still held when the page regains focus.
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect(keyboard.held.size).toBe(0);
  });

  it('ignores a keyup for a key that is not down', () => {
    const keyboard = createKeyboard();
    keyboard.keyUp({ code: 'KeyA' });
    expect(keyboard.held.size).toBe(0);
  });

  it('releases every key at once', () => {
    const keyboard = createKeyboard();
    for (const code of ['KeyA', 'KeyD', 'ArrowUp']) {
      keyboard.keyDown({ code, repeat: false });
    }
    keyboard.releaseAll();
    expect(keyboard.held.size).toBe(0);
  });
});

describe('resolveActions', () => {
  type Action = 'up' | 'down' | 'left' | 'right' | 'lamp' | 'fullscreen';
  const BINDINGS: Bindings<Action> = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    lamp: ['Space'],
    fullscreen: ['KeyF'],
  };
  const OFF = { up: false, down: false, left: false, right: false, lamp: false, fullscreen: false };

  it('turns held keys into actions, one action from either of its keys', () => {
    expect(resolveActions(new Set(['KeyW']), BINDINGS)).toStrictEqual({ ...OFF, up: true });
    expect(resolveActions(new Set(['ArrowUp']), BINDINGS)).toStrictEqual({ ...OFF, up: true });
    expect(resolveActions(new Set(['ArrowUp', 'KeyD']), BINDINGS)).toStrictEqual({
      ...OFF,
      up: true,
      right: true,
    });
  });

  it('gives every action off for no keys and for unbound keys', () => {
    expect(resolveActions(new Set(), BINDINGS)).toStrictEqual(OFF);
    expect(resolveActions(new Set(['Enter', 'KeyQ']), BINDINGS)).toStrictEqual(OFF);
  });

  it('does not mind both keys of one action being down', () => {
    expect(resolveActions(new Set(['ArrowUp', 'KeyW']), BINDINGS)).toStrictEqual({
      ...OFF,
      up: true,
    });
  });

  it('turns Space into lamp, beside the movement keys', () => {
    expect(resolveActions(new Set(['Space']), BINDINGS)).toStrictEqual({ ...OFF, lamp: true });
    expect(resolveActions(new Set(['Space', 'KeyA']), BINDINGS)).toStrictEqual({
      ...OFF,
      lamp: true,
      left: true,
    });
  });
});
