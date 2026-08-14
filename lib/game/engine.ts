import Matter, { type Body } from 'matter-js';
import type { PricePoint } from '@/lib/data/types';
import { applyPitch, buildBike, driveWheels, type Bike } from './bike';
import { createCamera, type Camera } from './camera';
import {
  BRAKE_TORQUE,
  CAT_TERRAIN,
  COIN_VALUE,
  DISTANCE_MULTIPLIER,
  FLIP_BONUS,
  FUEL_BURN_RATE,
  FUEL_MAX,
  FUEL_REFILL,
  GRAVITY,
  MAX_WHEEL_SPEED,
  PITCH_TORQUE,
  PX_PER_METER,
  RUNWAY_SEGMENTS,
  SEGMENT_W,
  WHEEL_TORQUE,
  WHEELIE_BUILD_S,
  WHEELIE_DECAY_S,
  WHEELIE_MAX_LIFT,
  WHEELIE_MIN_LIFT,
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
  let wheelieHold = 0; // 0..1 sustained-gas buildup driving the wheelie lift multiplier
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

  // Head-crash detection stays event-driven (a fresh contact is a clean trigger).
  let headHit = false;

  const isTerrain = (b: Body) => b.collisionFilter.category === CAT_TERRAIN;

  const onStart = (e: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of e.pairs) {
      const { bodyA, bodyB } = pair;
      if ((bodyA === bike.head && isTerrain(bodyB)) || (bodyB === bike.head && isTerrain(bodyA))) {
        headHit = true;
      }
    }
  };
  Events.on(matter, 'collisionStart', onStart);

  // Grounded detection — AUTHORITATIVE per-step scan of the solver's live contact
  // pairs, NOT collisionStart/End bookkeeping. The terrain is hundreds of separate
  // static quads; a resting wheel straddles a seam and Matter fires collisionEnd
  // without a matching collisionStart, so an event-set "touching" goes stale and the
  // bike reads airborne while planted (→ constant nose-up air-pitch → the rear hops
  // like a monkey). Reading engine.pairs.list each step is the ground truth: a wheel
  // is grounded iff it has an ACTIVE contact pair with a terrain body right now.
  type WithPairs = Matter.Engine & { pairs: { list: Matter.Pair[] } };
  const pairList = () => (matter as WithPairs).pairs.list;
  const isWheelGrounded = (wheel: Body): boolean => {
    for (const p of pairList()) {
      if (!p.isActive) continue;
      const { bodyA, bodyB } = p;
      if (bodyA === wheel && isTerrain(bodyB)) return true;
      if (bodyB === wheel && isTerrain(bodyA)) return true;
    }
    return false;
  };
  const countGrounded = (): number => {
    let g = 0;
    for (const w of bike.wheels) if (isWheelGrounded(w)) g++;
    return g;
  };
  // Cached each step so drive (top of step) and getState read a consistent value.
  let groundedCount = 0;

  const finishX = terrain.worldWidth - SEGMENT_W * 2;

  const step = (input: Input, dtMs: number) => {
    if (over) return;
    const dtSec = dtMs / 1000;

    // Snapshot the end-of-last-step pose for render interpolation, before we advance.
    prev = capturePose();

    // Grounded count from the live contact pairs — used only for the airborne flag
    // (flip scoring / dust fx). The drive itself is kinematic and doesn't depend on it.
    groundedCount = countGrounded();

    // KINEMATIC drive (initial-commit model): gas spins BOTH wheels up to MAX_WHEEL_SPEED
    // (AWD = max traction so it holds speed on climbs); brake spins both backward. Setting
    // wheel velocity directly adds NO chassis reaction torque, so throttle never rears or
    // hops the bike — applyPitch is the only chassis torque (lean / air control). Forward
    // ramps at WHEEL_TORQUE ≥ BRAKE_TORQUE so acceleration is never slower than reverse.
    //
    // WHEELIE BUILDUP: holding gas ramps `wheelieHold` 0→1 over WHEELIE_BUILD_S, scaling
    // the nose-up torque from MIN_LIFT to MAX_LIFT. A pinned throttle therefore lifts the
    // nose past recovery and loops out (head crash) — the downside of never braking.
    // Off-gas it drains in WHEELIE_DECAY_S, and brake noses down, so feathering gas and
    // braking before landings is the skill that gets rewarded.
    if (input.gas && fuel > 0) {
      wheelieHold = Math.min(1, wheelieHold + dtSec / WHEELIE_BUILD_S);
      const lift = WHEELIE_MIN_LIFT + (WHEELIE_MAX_LIFT - WHEELIE_MIN_LIFT) * wheelieHold;
      driveWheels(bike.wheels, 1, WHEEL_TORQUE, MAX_WHEEL_SPEED, dtSec, false); // AWD
      applyPitch(bike.chassis, -1, PITCH_TORQUE * lift);
      fuel = Math.max(0, fuel - FUEL_BURN_RATE * dtSec);
    } else {
      wheelieHold = Math.max(0, wheelieHold - dtSec / WHEELIE_DECAY_S);
      if (input.brake) {
        driveWheels(bike.wheels, -1, BRAKE_TORQUE, MAX_WHEEL_SPEED, dtSec, false);
        applyPitch(bike.chassis, 1, PITCH_TORQUE);
      }
    }

    Engine.update(matter, dtMs);

    const cx = bike.chassis.position.x;
    const cy = bike.chassis.position.y;
    const speed = Math.hypot(bike.chassis.velocity.x, bike.chassis.velocity.y);
    distance = Math.max(distance, cx - spawnX);

    // Flip detection: accumulate chassis rotation while airborne. Recompute from the
    // contacts this step's Engine.update just produced for an accurate landing edge.
    groundedCount = countGrounded();
    const isAirborne = groundedCount === 0;
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
        airborne: groundedCount === 0,
        rearSpin: bike.wheels[0].angularVelocity,
        wheels: bike.wheels.map((w, i) => ({
          x: lerp(prev.wheels[i].x, cur.wheels[i].x, alpha),
          y: lerp(prev.wheels[i].y, cur.wheels[i].y, alpha),
          angle: w.angle,
        })),
        headX: lerp(prev.hx, cur.hx, alpha),
        headY: lerp(prev.hy, cur.hy, alpha),
      },
      distance: Math.max(0, distance) / PX_PER_METER,
      fuel,
      coinsCollected,
      score,
      price: terrain.priceAt(bike.chassis.position.x),
      date: terrain.dateAt(bike.chassis.position.x),
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
      Composite.clear(matter.world, false, true);
      Engine.clear(matter);
    },
  };
}
