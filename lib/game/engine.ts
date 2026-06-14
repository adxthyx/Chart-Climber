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
  RUNWAY_SEGMENTS,
  SEGMENT_W,
  WHEEL_TORQUE,
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
  getState: () => GameState;
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
  let viewW = 1280;
  let viewH = 720;

  // Flip / stunt tracking.
  let prevChassisAngle = bike.chassis.angle;
  let flipsInAir = 0; // accumulated chassis rotation (rad) while airborne
  let wasAirborne = false;
  let totalFlips = 0;
  let flipBonus = 0;

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

    // RWD: gas powers only the rear wheel; brake applies to both.
    // Smooth accel: driveWheels is rate-limited at WHEEL_TORQUE rad/sec.
    if (input.gas && fuel > 0) {
      driveWheels(bike.wheels, 1, WHEEL_TORQUE, MAX_WHEEL_SPEED, dtSec, true);
      applyPitch(bike.chassis, -1, PITCH_TORQUE);
      fuel = Math.max(0, fuel - FUEL_BURN_RATE * dtSec);
    } else if (input.brake) {
      driveWheels(bike.wheels, -1, BRAKE_TORQUE, MAX_WHEEL_SPEED, dtSec, false);
      applyPitch(bike.chassis, 1, PITCH_TORQUE);
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

  const getState = (): GameState => {
    const score = Math.round(distance * DISTANCE_MULTIPLIER + coinsCollected * COIN_VALUE + flipBonus);
    return {
      bike: {
        x: bike.chassis.position.x,
        y: bike.chassis.position.y,
        angle: bike.chassis.angle,
        speed: Math.hypot(bike.chassis.velocity.x, bike.chassis.velocity.y),
        airborne: touching.size === 0,
        wheels: bike.wheels.map((w) => ({
          x: w.position.x,
          y: w.position.y,
          angle: w.angle,
        })),
        headX: bike.head.position.x,
        headY: bike.head.position.y,
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
