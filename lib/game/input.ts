import type { Input } from './types';

// Unifies keyboard and touch into a single { gas, brake } poll-able state.
// Touch buttons call setTouch(); keyboard is wired via attach().
export type InputController = {
  state: Input;
  attach: () => void;
  detach: () => void;
  setTouchGas: (on: boolean) => void;
  setTouchBrake: (on: boolean) => void;
};

const GAS_KEYS = new Set(['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW']);
const BRAKE_KEYS = new Set(['ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS']);
const PREVENT = new Set([...GAS_KEYS, ...BRAKE_KEYS, 'Space']);

export function createInput(): InputController {
  const keyGas = new Set<string>();
  const keyBrake = new Set<string>();
  let touchGas = false;
  let touchBrake = false;

  const state: Input = { gas: false, brake: false };
  const refresh = () => {
    state.gas = keyGas.size > 0 || touchGas;
    state.brake = keyBrake.size > 0 || touchBrake;
  };

  const onDown = (e: KeyboardEvent) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (GAS_KEYS.has(e.code)) keyGas.add(e.code);
    if (BRAKE_KEYS.has(e.code)) keyBrake.add(e.code);
    refresh();
  };
  const onUp = (e: KeyboardEvent) => {
    keyGas.delete(e.code);
    keyBrake.delete(e.code);
    refresh();
  };
  const onBlur = () => {
    keyGas.clear();
    keyBrake.clear();
    refresh();
  };

  return {
    state,
    attach() {
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      window.addEventListener('blur', onBlur);
    },
    detach() {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    },
    setTouchGas(on) {
      touchGas = on;
      refresh();
    },
    setTouchBrake(on) {
      touchBrake = on;
      refresh();
    },
  };
}
