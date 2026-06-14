import Matter, { type Body, type Composite as TComposite } from 'matter-js';
import {
  CAT_CHASSIS,
  CAT_HEAD,
  CAT_TERRAIN,
  CAT_WHEEL,
  CHASSIS_H,
  CHASSIS_W,
  HEAD_OFFSET_Y,
  HEAD_R,
  SUSPENSION_STIFFNESS,
  WHEEL_BASE,
  WHEEL_DROP,
  WHEEL_R,
} from './constants';

const { Bodies, Composite, Constraint } = Matter;

// Negative shared group: all bike parts ignore each other, so only terrain
// contacts matter (and the head/terrain contact triggers the crash).
const BIKE_GROUP = -1;

export type Bike = {
  composite: TComposite;
  chassis: Body;
  wheels: [Body, Body];
  head: Body;
};

export function buildBike(startX: number, startY: number): Bike {
  const chassis = Bodies.rectangle(startX, startY, CHASSIS_W, CHASSIS_H, {
    density: 0.0017,
    friction: 0.3,
    chamfer: { radius: 6 },
    collisionFilter: { group: BIKE_GROUP, category: CAT_CHASSIS, mask: CAT_TERRAIN },
  });

  const wheelOpts = {
    density: 0.0012,
    friction: 0.95,
    frictionStatic: 1.2,
    restitution: 0.08,
    collisionFilter: { group: BIKE_GROUP, category: CAT_WHEEL, mask: CAT_TERRAIN },
  } as const;

  const rear = Bodies.circle(startX - WHEEL_BASE, startY + WHEEL_DROP, WHEEL_R, wheelOpts);
  const front = Bodies.circle(startX + WHEEL_BASE, startY + WHEEL_DROP, WHEEL_R, wheelOpts);

  // Rider head: contact with terrain = game over. A bit of mass up high raises
  // the center of gravity so the bike can actually be flipped (and crashed).
  const head = Bodies.circle(startX, startY - HEAD_OFFSET_Y, HEAD_R, {
    density: 0.0011,
    collisionFilter: { group: BIKE_GROUP, category: CAT_HEAD, mask: CAT_TERRAIN },
  });

  // Pin each wheel center to a chassis-local axle point. Coincident points fully
  // constrain translation (no orbiting) while the wheel still spins freely;
  // stiffness < 1 gives the suspension a little give.
  const mkAxle = (wheel: Body, dx: number) =>
    Constraint.create({
      bodyA: chassis,
      pointA: { x: dx, y: WHEEL_DROP },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      stiffness: SUSPENSION_STIFFNESS,
      damping: 0.2,
      length: 0,
    });

  // Rigid link holding the head above the chassis.
  const neck = Constraint.create({
    bodyA: chassis,
    pointA: { x: 0, y: -HEAD_OFFSET_Y },
    bodyB: head,
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    length: 0,
  });

  const composite = Composite.create({ label: 'bike' });
  Composite.add(composite, [
    chassis,
    rear,
    front,
    head,
    mkAxle(rear, -WHEEL_BASE),
    mkAxle(front, WHEEL_BASE),
    neck,
  ]);

  return { composite, chassis, wheels: [rear, front], head };
}

// Marker so the engine can identify terrain category in collision pairs.
export const TERRAIN_CATEGORY = CAT_TERRAIN;

// Rate-limited wheel drive. `accel` is in rad/sec; per-step delta = accel * dtSec.
// RWD: gas only powers the rear wheel (index 0); braking applies to both.
// This gives smooth spin-up rather than instant max-speed snap.
export function driveWheels(
  wheels: [Body, Body],
  dir: number,
  accel: number,
  maxSpeed: number,
  dtSec: number,
  rearOnly = false,
): void {
  const targets: Body[] = rearOnly ? [wheels[0]] : [wheels[0], wheels[1]];
  const delta = accel * dtSec;
  const targetVel = dir > 0 ? maxSpeed : -maxSpeed;
  for (const w of targets) {
    const diff = targetVel - w.angularVelocity;
    const next =
      Math.abs(diff) <= delta
        ? targetVel
        : w.angularVelocity + Math.sign(diff) * delta;
    Matter.Body.setAngularVelocity(w, next);
  }
}

// Pitch the chassis: gas (+1) rotates the nose up for wheelies/back-flips, brake
// (-1) noses down for front-flips. Scaled by chassis inertia so it's frame-rate
// independent. This is the control players use to keep level — or over-rotate
// and crash. torque is consumed and zeroed by Engine.update each step.
export function applyPitch(chassis: Body, dir: number, amount: number): void {
  chassis.torque += dir * amount * (chassis.inertia / 10000);
}
