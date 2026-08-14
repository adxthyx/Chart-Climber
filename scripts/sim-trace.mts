// Airborne% under gas-held (naive player) — proxy for felt "hopping". GAS=0 coasts.
import { createGameEngine } from '../lib/game/engine';
import type { PricePoint } from '../lib/data/types';
const FIXED_DT = 1000 / 60;
const key = process.argv[2] ?? 'NVDA_1Y';
const gas = process.env.GAS !== '0';
const mod = await import(`../lib/data/static/${key}.json`, { with: { type: 'json' } });
const points = (mod.default as { points: PricePoint[] }).points;
const engine = createGameEngine(points);
const input = { gas, brake: false };
let air = 0, n = 0, hops = 0, prev = false, maxV = 0;
for (let i = 0; i < 2000; i++) {
  input.gas = gas; input.brake = false;
  engine.step(input, FIXED_DT);
  const s = engine.getState(1); n++;
  if (s.bike.airborne) air++;
  if (s.bike.airborne && !prev) hops++;
  prev = s.bike.airborne;
  maxV = Math.max(maxV, s.bike.speed);
  if (s.over) break;
}
console.log(`${key}: air=${(100*air/n).toFixed(0)}% hops=${hops}/${n} topSpd=${maxV.toFixed(1)}`);
engine.destroy();
