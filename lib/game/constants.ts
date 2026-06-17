// Central tuning. Change feel here, not in the physics/render modules.

// --- Physics ---
export const GRAVITY = 1.4; // Matter world gravity scale
// Smooth accel: angular acceleration in rad/sec applied to wheel(s).
// At 60fps: per-step delta = WHEEL_TORQUE / 60. Spin-up to MAX_WHEEL_SPEED
// takes ~MAX_WHEEL_SPEED / (WHEEL_TORQUE/60) ≈ 10 frames = 0.17 s.
export const WHEEL_TORQUE = 28; // rad/sec spin-up rate — high so throttle responds in ~2 frames (crisp, not mushy)
export const MAX_WHEEL_SPEED = 1.6; // clamp on wheel angular velocity (rad/step) — more climb power + top speed
export const BRAKE_TORQUE = 22; // rad/sec — braking is sharper than acceleration
export const SUSPENSION_STIFFNESS = 0.9; // firmer axle; reduces horizontal wobble
// Pitch torque applied to the chassis on input — this is what makes wheelies and
// flips possible (gas pitches the nose up, brake pitches it down). Over-rotating
// in the air lands you on the rider's head = crash. Tuned to chassis inertia.
export const PITCH_TORQUE = 0.1;

// --- Stunt scoring ---
export const FLIP_BONUS = 300; // portfolio bonus per full mid-air flip

// --- Terrain ---
export const SEGMENT_W = 60; // px between adjacent price points (world x)
// Vertical scale: px of rise per unit log-return. A day's % move maps to a
// FIXED steepness regardless of the asset's absolute price or total range, so a
// +5% day is always a real hill (no global min/max squashing). Tune feel here.
export const PX_PER_RETURN = 1800; // px per 1.0 log-return (~+5% day ≈ 88px rise)
export const MAX_STEP_RETURN = 0.12; // clamp |per-day log-return| so gaps/bad ticks can't make vertical walls
export const TERRAIN_TOP = 120; // px padding above the highest point of the climb
export const FLOOR_OFFSET = 400; // depth of solid ground below the lowest surface point
export const RUNWAY_SEGMENTS = 4; // flat segments before the first data point
export const RESAMPLE_SUB = 3; // Catmull-Rom sub-points per segment (1 = none) — ramps sharp days so they stay drivable

// --- Bike ---
export const CHASSIS_W = 70;
export const CHASSIS_H = 22;
export const WHEEL_R = 20;
export const WHEEL_BASE = 46; // half-distance between wheels from chassis center
export const WHEEL_DROP = 16; // wheels sit this far below chassis center (exported for renderer)
export const HEAD_R = 10;
export const HEAD_OFFSET_Y = 34; // rider head height above chassis center (raises CG)

// --- Fuel / scoring ---
export const FUEL_MAX = 100;
export const FUEL_BURN_RATE = 4.0; // units per second while accelerating
export const FUEL_REFILL = 45; // units restored per fuel can
export const FUEL_SPACING = 3000; // world-x px between fuel cans along the track
export const COIN_VALUE = 50;
export const DISTANCE_MULTIPLIER = 0.2; // portfolio value per world-x px — doubled to offset halved SEGMENT_W

// --- Camera ---
export const CAMERA_LERP = 0.16; // snappier follow — 0.08 dragged ~30 frames behind, felt laggy
export const CAMERA_LOOKAHEAD = 160; // px ahead in travel direction
export const CAMERA_Y_OFFSET = -60; // raise view so bike sits lower-third

// --- Collision categories ---
export const CAT_TERRAIN = 0x0001;
export const CAT_WHEEL = 0x0002;
export const CAT_CHASSIS = 0x0004;
export const CAT_HEAD = 0x0008;

// --- Colors (canvas) ---
export const COLORS = {
  skyTop: '#0b1220',
  skyBottom: '#111a2e',
  grid: 'rgba(120,160,220,0.08)',
  surface: '#e2e8f0',
  up: 'rgba(74,222,128,0.55)', // green day fill
  down: 'rgba(248,113,113,0.55)', // red day fill
  coin: '#fbbf24',
  coinEdge: '#b45309',
  chassis: '#e2e8f0',
  chassisStroke: '#0f172a',
  wheel: '#1e293b',
  wheelRim: '#94a3b8',
  rider: '#38bdf8',
};
