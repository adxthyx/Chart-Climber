// Fixed-timestep rAF loop. Physics advances in deterministic 16.666ms steps
// regardless of display refresh; rendering happens once per animation frame.
const FIXED_DT = 1000 / 60;
const MAX_FRAME = 250; // clamp to avoid the spiral of death after a tab stall

export type GameLoop = {
  start: () => void;
  stop: () => void;
};

export function createLoop(step: (dt: number) => void, render: () => void): GameLoop {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;

  const frame = (now: number) => {
    if (!running) return;
    let elapsed = now - last;
    last = now;
    if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;
    acc += elapsed;
    while (acc >= FIXED_DT) {
      step(FIXED_DT);
      acc -= FIXED_DT;
    }
    render();
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
