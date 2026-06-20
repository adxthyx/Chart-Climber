import Matter, { type Body, type Composite as TComposite } from 'matter-js';
import {
  CAT_CHASSIS,
  CAT_HEAD,
  CAT_TERRAIN,
  CAT_WHEEL,
  CHASSIS_H,
  CHASSIS_W,
  FRONT_DRIVE_RATIO,
  HEAD_OFFSET_Y,
  HEAD_R,
  MAX_WHEEL_SPIN,
  MOTOR_TORQUE,
  PITCH_INERTIA_REF,
  SUSPENSION_STIFFNESS,
  WHEEL_BASE,
  WHEEL_DROP,
  WHEEL_FRICTION,
  WHEEL_FRICTION_STATIC,
  WHEEL_INERTIA_REF,
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
    friction: WHEEL_FRICTION, // high grip so the rear bites on climbs / front doesn't wash out
    frictionStatic: WHEEL_FRICTION_STATIC,
    restitution: 0.02, // minimal bounce so wheels track bumps instead of skipping
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

// Wrap an angle error into [-π, π] so PD controllers take the short way round.
function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ENGINE DRIVE — genuine TORQUE-based all-wheel drive. Real torque is added to each
// wheel (NOT a velocity override); the Matter solver converts it to forward motion
// through contact friction, so acceleration is load-dependent (bogs on climbs, the
// tyre can slip) and the chassis gets a real pitch reaction. `throttle` (0..1) is the
// smoothed gas level. The rear wheel gets full MOTOR_TORQUE; the front wheel gets
// FRONT_DRIVE_RATIO of it (AWD) so it keeps biting when the rear unloads over a crest
// or in a dip — that's what stops the bike getting stuck on steep ups/downs. Each
// wheel's torque tapers toward zero as its spin nears MAX_WHEEL_SPIN, giving a natural
// top speed instead of accelerating forever.
export function applyEngineTorque(wheels: [Body, Body], throttle: number): void {
  if (throttle <= 0) return;
  applyWheelTorque(wheels[0], MOTOR_TORQUE * throttle); // rear (drive)
  applyWheelTorque(wheels[1], MOTOR_TORQUE * throttle * FRONT_DRIVE_RATIO); // front (traction)
}

function applyWheelTorque(wheel: Body, torque: number): void {
  // Taper to a top speed: full torque at rest, fading to 0 as spin → MAX_WHEEL_SPIN.
  const taper = Math.max(0, 1 - wheel.angularVelocity / MAX_WHEEL_SPIN);
  if (taper <= 0) return;
  // Scale by the wheel's own inertia (vs a reference) so the feel is independent of
  // wheel mass/radius — a units convention, the drive itself is pure dynamics.
  wheel.torque += torque * taper * (wheel.inertia / WHEEL_INERTIA_REF);
}

// BRAKING / REVERSE via torque (never a velocity override). Applies an opposing torque
// to both wheels proportional to current spin — a firm friction brake that pulls them
// to a stop — then a small steady reverse torque once nearly stopped so the bike backs
// up slowly instead of snapping into reverse.
export function brakeReverse(
  wheels: [Body, Body],
  brakeTorque: number,
  reverseTorque: number,
): void {
  for (const w of wheels) {
    if (Math.abs(w.angularVelocity) > 0.05) {
      const mag = Math.min(brakeTorque, brakeTorque * Math.abs(w.angularVelocity));
      w.torque += -Math.sign(w.angularVelocity) * mag * w.inertia;
    } else {
      w.torque += -reverseTorque * w.inertia;
    }
  }
}

// GROUNDED BALANCE ASSIST — a SOFT, OVERPOWERABLE anti-tumble (rider weight shift),
// NOT a kinematic slope-lock. A PD controller adds a CAPPED corrective torque toward
// the terrain slope: it settles the bike on normal/moderate grades, but its authority
// is finite (clamped to ±maxTorque), so flooring the throttle on a steep wall produces
// more drive-reaction torque than the assist can cancel → the bike wheelies, can loop,
// and can crash on its head. Only called while grounded; in the air the player keeps
// full pitch control for flips. Scaled by chassis inertia so it's frame-rate independent.
export function balanceChassis(
  chassis: Body,
  targetAngle: number,
  kp: number,
  kd: number,
  maxTorque: number,
): void {
  const err = wrapAngle(targetAngle - chassis.angle);
  const raw = (kp * err - kd * chassis.angularVelocity) * (chassis.inertia / PITCH_INERTIA_REF);
  const t = Math.max(-maxTorque, Math.min(maxTorque, raw));
  chassis.torque += t;
}

// AIR PITCH CONTROL. gas (+1) rotates the nose up for wheelies/back-flips, brake (-1)
// noses down for front-flips. Air-gated by the caller. Scaled by chassis inertia so
// it's frame-rate independent. torque is consumed/zeroed by Engine.update each step.
export function applyAirPitch(chassis: Body, dir: number, amount: number): void {
  chassis.torque += dir * amount * (chassis.inertia / PITCH_INERTIA_REF);
}
