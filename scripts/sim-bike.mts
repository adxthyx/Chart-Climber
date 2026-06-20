// Headless physics verification harness (dev-only, not shipped).
// Runs the real game engine with gas held down over a course and reports whether the
// bike completes it. Physics is deterministic and `step()` never reads wall-clock, so
// this faithfully reproduces a clean run. Usage: npx tsx scripts/sim-bike.mts [SYMBOL_RANGE ...]
import { createGameEngine } from '../lib/game/engine';
import type { PricePoint } from '../lib/data/types';

const FIXED_DT = 1000 / 60;
const MAX_STEPS = 150_000; // ~41 min of sim time — plenty for a 5Y course

async function loadPoints(key: string): Promise<PricePoint[]> {
  const mod = await import(`../lib/data/static/${key}.json`, { with: { type: 'json' } });
  return (mod.default as { points: PricePoint[] }).points;
}

function run(key: string, points: PricePoint[]) {
  const engine = createGameEngine(points);
  const worldWidth = engine.terrain.worldWidth;
  const input = { gas: true, brake: false };

  // Simple "competent player" driver: gas on the ground, but ease off when airborne
  // or when pitched too far back (about to loop) so we test whether the PHYSICS allow
  // a clean run — not the unrealistic "gas pinned through every jump = backflip" case.
  const CRUISE = 11; // px/step — a sane player doesn't pin the throttle down a volatile descent
  const drive = (angle: number, slope: number, airborne: boolean, speed: number) => {
    // Gate on PITCH (about-to-loop), not on mere airborne — small bumps must not kill
    // momentum on choppy terrain. Reference to the slope when grounded, to level (0)
    // when airborne so we tuck for landing.
    const ref = airborne ? 0 : slope;
    const pitchErr = angle - ref; // + = nosed back
    if (pitchErr > 0.85) { input.gas = false; input.brake = true; return; } // looping back → settle/tuck
    if (pitchErr > 0.55) { input.gas = false; input.brake = false; return; } // ease off
    if (speed > CRUISE) { input.gas = false; input.brake = false; return; } // coast at cruise speed
    input.gas = true; input.brake = false;
  };

  let steps = 0;
  let lastLogX = -Infinity;
  let maxX = 0;
  let stuckAt = 0;
  let stuckSteps = 0;

  for (; steps < MAX_STEPS; steps++) {
    const pre = engine.getState(1);
    drive(pre.bike.angle, engine.terrain.slopeAt(pre.bike.x), pre.bike.airborne, pre.bike.speed);
    engine.step(input, FIXED_DT);
    const s = engine.getState(1);
    const x = s.bike.x;
    maxX = Math.max(maxX, x);

    // Progress log every ~600px.
    if (x - lastLogX > 600) {
      lastLogX = x;
      console.log(
        `  x=${x.toFixed(0)}/${worldWidth.toFixed(0)} (${((x / worldWidth) * 100).toFixed(0)}%) ` +
          `fuel=${s.fuel.toFixed(0)} spd=${s.bike.speed.toFixed(1)} ang=${(s.bike.angle * 180 / Math.PI).toFixed(0)}°`,
      );
    }

    // Stuck detector (informational): not advancing for a while.
    if (x > stuckAt + 5) { stuckAt = x; stuckSteps = 0; } else { stuckSteps++; }

    if (s.over) {
      const tag = s.finished ? 'FINISHED ✅' : `OVER ❌ (${s.reason})`;
      console.log(
        `  → ${tag} at x=${x.toFixed(0)}/${worldWidth.toFixed(0)} ` +
          `(${((x / worldWidth) * 100).toFixed(0)}%) after ${steps} steps, maxX=${maxX.toFixed(0)}`,
      );
      engine.destroy();
      return s.finished;
    }
    if (stuckSteps > 1800) { // ~30s with no forward progress
      console.log(`  → STUCK ❌ at x=${x.toFixed(0)} (${((x / worldWidth) * 100).toFixed(0)}%), ang=${(s.bike.angle*180/Math.PI).toFixed(0)}° after ${steps} steps`);
      engine.destroy();
      return false;
    }
  }
  console.log(`  → TIMEOUT ❌ maxX=${maxX.toFixed(0)}/${worldWidth.toFixed(0)} after ${MAX_STEPS} steps`);
  engine.destroy();
  return false;
}

const keys = process.argv.slice(2);
if (keys.length === 0) keys.push('NVDA_5Y');

let allPass = true;
for (const key of keys) {
  console.log(`\n=== ${key} ===`);
  const points = await loadPoints(key);
  console.log(`  ${points.length} points`);
  const ok = run(key, points);
  allPass = allPass && ok;
}
console.log(`\n${allPass ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`);
process.exit(allPass ? 0 : 1);
