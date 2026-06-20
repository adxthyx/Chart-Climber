import Matter, { type Body } from 'matter-js';
import type { PricePoint } from '@/lib/data/types';
import { applyAirPitch, applyEngineTorque, balanceChassis, brakeReverse, buildBike, type Bike } from './bike';
import { createCamera, type Camera } from './camera';
import {
  BALANCE_KD,
  BALANCE_KP,
  BALANCE_MAX_TORQUE,
  BRAKE_TORQUE,
  CAT_TERRAIN,
  COIN_VALUE,
  DISTANCE_MULTIPLIER,
  FLIP_BONUS,
  FUEL_BURN_RATE,
  FUEL_MAX,
  FUEL_REFILL,
  GRAVITY,
  PITCH_TORQUE,
  REVERSE_TORQUE,
  RUNWAY_SEGMENTS,
  SEGMENT_W,
  THROTTLE_RAMP,
  WHEELIE_EASE_FULL,
  WHEELIE_EASE_START,
  WHEELIE_MIN_POWER,
} from './constants';
import { buildTerrain } from './terrain';
import type { Coin, GameState, Input, Terrain } from './types';

const { Engine, Composite, Events } = Matter;
const COIN_R = 16;
const PICKUP_DIST = 42;

export type GameEngine = {
  terrain: Terrain;
  camera: Camera;
  coins: Coin[];
  fuels: Coin[];
  bike: Bike;
  step: (input: Input, dtMs: number) => void;
  getState: (alpha?: number) => GameState;
  getCamera: (alpha?: number) => { x: number; y: number };
  setViewport: (w: number, h: number) => void;
  destroy: () => void;
};

export function createGameEngine(points: PricePoint[]): GameEngine {
  const terrain = buildTerrain(points);
  const matter = Engine.create();
  matter.gravity.y = GRAVITY;
  Composite.add(matter.world, terrain.bodies);

  // Spawn on the flat runway, a little above the surface so it settles in.
  const spawnX = SEGMENT_W * (RUNWAY_SEGMENTS - 2.5);
  const spawnY = terrain.surface[0].y - 70;
  const bike = buildBike(spawnX, spawnY);
  Composite.add(matter.world, bike.composite);

  const camera = createCamera(0, spawnY - 200);

  const coins: Coin[] = terrain.coins.map((c) => ({
    x: c.x,
    y: c.y,
    r: COIN_R,
    collected: false,
    pop: -1,
  }));

  const fuels: Coin[] = terrain.fuels.map((f) => ({
    x: f.x,
    y: f.y,
    r: 18,
    collected: false,
    pop: -1,
  }));

  // Mutable run state.
  let fuel = FUEL_MAX;
  let distance = 0;
  let coinsCollected = 0;
  let over = false;
  let finished = false;
  let reason: GameState['reason'] = null;
  let stalled = 0; // ms spent nearly stopped with no fuel
  let throttle = 0; // smoothed gas level (0..1) — eased toward the input for smooth power delivery
  let viewW = 1280;
  let viewH = 720;

  // Flip / stunt tracking.
  let prevChassisAngle = bike.chassis.angle;
  let flipsInAir = 0; // accumulated chassis rotation (rad) while airborne
  let wasAirborne = false;
  let totalFlips = 0;
  let flipBonus = 0;

  // Render interpolation: the loop steps physics at a fixed dt but renders on every
  // animation frame, so we lerp between the previous and current pose by `alpha`
  // (= leftover accumulator / dt). Without this the bike stutters on any refresh that
  // doesn't line up with the 60 Hz step. `prev` is refreshed at the TOP of each step
  // (i.e. it holds the end-of-last-step pose) before Engine.update advances the world.
  type Pose = {
    cx: number; cy: number; ca: number;
    wheels: { x: number; y: number }[];
    hx: number; hy: number;
    camx: number; camy: number;
  };
  const capturePose = (): Pose => ({
    cx: bike.chassis.position.x,
    cy: bike.chassis.position.y,
    ca: bike.chassis.angle,
    wheels: bike.wheels.map((w) => ({ x: w.position.x, y: w.position.y })),
    hx: bike.head.position.x,
    hy: bike.head.position.y,
    camx: camera.x,
    camy: camera.y,
  });
  let prev = capturePose();
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Collision tracking: which wheels touch terrain (airborne = none), and head hit.
  const wheelSet = new Set<Body>(bike.wheels);
  const touching = new Set<Body>();
  let headHit = false;

  const isTerrain = (b: Body) => b.collisionFilter.category === CAT_TERRAIN;

  const onStart = (e: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of e.pairs) {
      const { bodyA, bodyB } = pair;
      if ((bodyA === bike.head && isTerrain(bodyB)) || (bodyB === bike.head && isTerrain(bodyA))) {
        headHit = true;
      }
      if (wheelSet.has(bodyA) && isTerrain(bodyB)) touching.add(bodyA);
      if (wheelSet.has(bodyB) && isTerrain(bodyA)) touching.add(bodyB);
    }
  };
  const onEnd = (e: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of e.pairs) {
      const { bodyA, bodyB } = pair;
      if (wheelSet.has(bodyA) && isTerrain(bodyB)) touching.delete(bodyA);
      if (wheelSet.has(bodyB) && isTerrain(bodyA)) touching.delete(bodyB);
    }
  };
  Events.on(matter, 'collisionStart', onStart);
  Events.on(matter, 'collisionEnd', onEnd);

  const finishX = terrain.worldWidth - SEGMENT_W * 2;

  const step = (input: Input, dtMs: number) => {
    if (over) return;
    const dtSec = dtMs / 1000;

    // Snapshot the end-of-last-step pose for render interpolation, before we advance.
    prev = capturePose();

    // Smoothly ease the throttle toward the gas input (0..1) so power delivery ramps
    // in and out instead of snapping — the "smooth acceleration". Gas only counts
    // while there's fuel. Uses the previous frame's contact set (touching) — a
    // one-frame lag is imperceptible.
    const airborne = touching.size === 0;
    const wantGas = input.gas && fuel > 0;
    const target = wantGas ? 1 : 0;
    const dThrottle = THROTTLE_RAMP * dtSec;
    throttle = target > throttle ? Math.min(target, throttle + dThrottle) : Math.max(target, throttle - dThrottle);

    const slope = terrain.slopeAt(bike.chassis.position.x);

    if (throttle > 0) {
      // Genuine torque-based AWD: real torque on both wheels, solver does the rest.
      // Keep driving the wheels even mid-hop so they keep spinning and bite on landing
      // (choppy charts skip the bike airborne constantly). Anti-wheelie: when grounded,
      // ease power as the nose climbs above the slope so the bike can't drive itself
      // into a backflip (still physical — just less torque).
      let factor = 1;
      if (!airborne) {
        let pitchErr = bike.chassis.angle - slope;
        while (pitchErr > Math.PI) pitchErr -= 2 * Math.PI;
        while (pitchErr < -Math.PI) pitchErr += 2 * Math.PI;
        const ease = (pitchErr - WHEELIE_EASE_START) / (WHEELIE_EASE_FULL - WHEELIE_EASE_START);
        factor = Math.max(WHEELIE_MIN_POWER, Math.min(1, 1 - ease));
      }
      applyEngineTorque(bike.wheels, throttle * factor);
      if (airborne) applyAirPitch(bike.chassis, 1, PITCH_TORQUE); // nose up for back-flips
    }
    if (wantGas) fuel = Math.max(0, fuel - FUEL_BURN_RATE * throttle * dtSec);

    if (input.brake) {
      brakeReverse(bike.wheels, BRAKE_TORQUE, REVERSE_TORQUE);
      if (airborne) applyAirPitch(bike.chassis, -1, PITCH_TORQUE); // nose down for front-flips
    }

    // Grounded balance assist: a SOFT, capped corrective torque toward the terrain
    // slope. It keeps the bike tracking the ground on normal grades, but its authority
    // is finite — over-gassing a steep wall overwhelms it and the bike can wheelie,
    // loop, and crash. Not called in the air, where the player controls pitch for flips.
    if (!airborne) {
      balanceChassis(bike.chassis, slope, BALANCE_KP, BALANCE_KD, BALANCE_MAX_TORQUE);
    }

    Engine.update(matter, dtMs);

    const cx = bike.chassis.position.x;
    const cy = bike.chassis.position.y;
    const speed = Math.hypot(bike.chassis.velocity.x, bike.chassis.velocity.y);
    distance = Math.max(distance, cx - spawnX);

    // Flip detection: accumulate chassis rotation while airborne.
    const isAirborne = touching.size === 0;
    const angleDelta = bike.chassis.angle - prevChassisAngle;
    prevChassisAngle = bike.chassis.angle;
    if (isAirborne) {
      flipsInAir += angleDelta;
    } else if (wasAirborne) {
      // Just landed — count full rotations.
      const newFlips = Math.floor(Math.abs(flipsInAir) / (Math.PI * 2));
      totalFlips += newFlips;
      flipBonus += newFlips * FLIP_BONUS;
      flipsInAir = 0;
    }
    wasAirborne = isAirborne;

    // Coin pickup via simple distance check against the chassis.
    for (const coin of coins) {
      if (coin.collected) continue;
      if (Math.hypot(coin.x - cx, coin.y - cy) < PICKUP_DIST) {
        coin.collected = true;
        coin.pop = 0;
        coinsCollected += 1;
      }
    }

    // Fuel cans refill the tank.
    for (const can of fuels) {
      if (can.collected) continue;
      if (Math.hypot(can.x - cx, can.y - cy) < PICKUP_DIST + 6) {
        can.collected = true;
        can.pop = 0;
        fuel = Math.min(FUEL_MAX, fuel + FUEL_REFILL);
      }
    }

    // Game-over checks.
    if (headHit) {
      over = true;
      reason = 'crash';
    } else if (cy > terrain.floorY + 40) {
      over = true;
      reason = 'fell';
    } else if (cx >= finishX) {
      over = true;
      finished = true;
    } else if (fuel <= 0 && speed < 0.4) {
      stalled += dtMs;
      if (stalled > 1500) {
        over = true;
        reason = 'fuel';
      }
    } else {
      stalled = 0;
    }

    camera.follow(cx, cy, bike.chassis.velocity.x, viewW, viewH, terrain.worldWidth, terrain.floorY);
  };

  // `alpha` (0..1) interpolates between the previous and current pose for smooth
  // rendering. Positions and chassis angle are lerped; wheel SPIN angle uses the
  // current value (a fast spin would lerp the short way and look wrong).
  const getState = (alpha = 1): GameState => {
    const score = Math.round(distance * DISTANCE_MULTIPLIER + coinsCollected * COIN_VALUE + flipBonus);
    const cur = capturePose();
    return {
      bike: {
        x: lerp(prev.cx, cur.cx, alpha),
        y: lerp(prev.cy, cur.cy, alpha),
        angle: lerp(prev.ca, cur.ca, alpha),
        speed: Math.hypot(bike.chassis.velocity.x, bike.chassis.velocity.y),
        airborne: touching.size === 0,
        rearSpin: bike.wheels[0].angularVelocity,
        wheels: bike.wheels.map((w, i) => ({
          x: lerp(prev.wheels[i].x, cur.wheels[i].x, alpha),
          y: lerp(prev.wheels[i].y, cur.wheels[i].y, alpha),
          angle: w.angle,
        })),
        headX: lerp(prev.hx, cur.hx, alpha),
        headY: lerp(prev.hy, cur.hy, alpha),
      },
      distance: Math.max(0, distance),
      fuel,
      coinsCollected,
      score,
      price: terrain.priceAt(bike.chassis.position.x),
      over,
      finished,
      reason,
      flips: totalFlips,
    };
  };

  return {
    terrain,
    camera,
    coins,
    fuels,
    bike,
    step,
    getState,
    getCamera: (alpha = 1) => ({
      x: lerp(prev.camx, camera.x, alpha),
      y: lerp(prev.camy, camera.y, alpha),
    }),
    setViewport(w, h) {
      viewW = w;
      viewH = h;
    },
    destroy() {
      Events.off(matter, 'collisionStart', onStart);
      Events.off(matter, 'collisionEnd', onEnd);
      Composite.clear(matter.world, false, true);
      Engine.clear(matter);
    },
  };
}
