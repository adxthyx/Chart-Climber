// Central tuning. Change feel here, not in the physics/render modules.

// --- Physics ---
// Restored from the initial commit's drive model: a KINEMATIC, rate-limited wheel
// drive (driveWheels sets the wheel's angular velocity directly — see bike.ts). Because
// it sets velocity rather than applying torque, the drive exerts no reaction torque on
// the chassis, so throttle never rears the bike up or makes it hop. Smooth and planted.
export const GRAVITY = 1.4; // Matter world gravity scale
// Smooth accel: angular acceleration in rad/sec applied to the wheel(s).
// At 60fps: per-step delta = WHEEL_TORQUE / 60. Spin-up to MAX_WHEEL_SPEED
// takes ~MAX_WHEEL_SPEED / (WHEEL_TORQUE/60) ≈ 10 frames = 0.17 s.
export const WHEEL_TORQUE = 9.0; // rad/sec — how fast the wheels spin up under gas (rate-limited). ≥ BRAKE_TORQUE so forward accel is never slower than reverse
export const MAX_WHEEL_SPEED = 0.82; // rad/step — top speed clamp on wheel angular velocity
export const BRAKE_TORQUE = 8.0; // rad/sec — braking/reverse spins down sharper than acceleration
export const TERRAIN_FRICTION = 1.6; // terrain grip (wheel friction is set in bike.ts)
export const SUSPENSION_STIFFNESS = 0.9; // firmer axle; reduces horizontal wobble
// Pitch torque applied to the chassis on input — this is what makes wheelies and
// flips possible (gas pitches the nose up, brake pitches it down). Over-rotating
// in the air lands you on the rider's head = crash. Tuned to chassis inertia.
export const PITCH_TORQUE = 0.18; // gas pitches the nose up (wheelie), brake noses down. Higher = stronger/faster wheelies (and easier to loop out)
// WHEELIE BUILDUP — the downside of pinning the throttle. Holding gas ramps a lift
// multiplier on the gas pitch torque from WHEELIE_MIN_LIFT (a tap) up to WHEELIE_MAX_LIFT
// (sustained hold) over WHEELIE_BUILD_S seconds: feathered gas stays flat, a pinned
// throttle progressively lifts the nose past recovery → loop → head crash. Releasing
// gas (or braking, which also noses down) dumps the buildup in WHEELIE_DECAY_S — this is
// what rewards players who actually use the brake instead of holding gas to the finish.
export const WHEELIE_BUILD_S = 2.0; // seconds of held gas to reach full lift
export const WHEELIE_DECAY_S = 0.3; // seconds off-gas for the buildup to drain
export const WHEELIE_MIN_LIFT = 0.5; // lift multiplier at first touch of gas (tame tap)
export const WHEELIE_MAX_LIFT = 2.2; // lift multiplier at full buildup (loops you out if unmanaged)
// --- Stunt scoring ---
export const FLIP_BONUS = 300; // portfolio bonus per full mid-air flip

// --- Terrain ---
export const SEGMENT_W = 70; // px between adjacent price points (world x) — wider = gentler grades
// Vertical scale: px of rise per unit log-return. A day's % move maps to a
// FIXED steepness regardless of the asset's absolute price or total range, so a
// +5% day is always a real hill (no global min/max squashing). Tune feel here.
export const PX_PER_RETURN = 1200; // px per 1.0 log-return. Drama comes from multi-day trends (cumulative, unclamped), not single-day walls
export const MAX_STEP_RETURN = 0.045; // clamp |per-day log-return| → caps a single grade to ~atan(1200·0.045/70)=37.6°
export const TERRAIN_TOP = 120; // px padding above the highest point of the climb
export const FLOOR_OFFSET = 400; // depth of solid ground below the lowest surface point
export const RUNWAY_SEGMENTS = 4; // flat segments before the first data point
export const RESAMPLE_SUB = 5; // Catmull-Rom sub-points per segment — smoother ramps: climbable + fewer micro-air skips (less choppy)
export const TERRAIN_SMOOTH = 0.1; // ≤0.1 low-pass blend over data y's — trims the sharpest overshoot spikes only; chart shape preserved

// --- Bike ---
export const CHASSIS_W = 70;
export const CHASSIS_H = 22;
export const WHEEL_R = 20;
export const WHEEL_BASE = 46; // half-distance between wheels from chassis center
export const WHEEL_DROP = 16; // wheels sit this far below chassis center (exported for renderer)
export const HEAD_R = 10;
export const HEAD_OFFSET_Y = 24;

// --- Fuel / scoring ---
export const FUEL_MAX = 100;
export const FUEL_BURN_RATE = 4.0; // units per second while accelerating
export const FUEL_REFILL = 45; // units restored per fuel can
export const FUEL_SPACING = 3000; // world-x px between fuel cans along the track
export const COIN_VALUE = 50;
export const DISTANCE_MULTIPLIER = 0.2; // portfolio value per world-x px — doubled to offset halved SEGMENT_W
// World px per displayed meter. Raw world-x is an arbitrary pixel scale (a 1Y chart is
// ~252 × SEGMENT_W ≈ 17.6k px, which read as "17,640 m" in the HUD — nonsense). At 10
// px/m a full 1Y run is ~1.76 km, which feels right for a hill-climb run.
export const PX_PER_METER = 10;

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
  skyTop: '#04060f',
  skyMid: '#0b1220',
  skyBottom: '#182742',
  horizonGlow: 'rgba(56,189,248,0.16)',
  star: '#dbeafe',
  moon: '#e2e8f0',
  // Background candlestick-skyline silhouettes (far layer is fainter/shorter).
  bgCandleUpFar: 'rgba(52,211,153,0.10)',
  bgCandleDownFar: 'rgba(248,113,113,0.08)',
  bgCandleUpNear: 'rgba(52,211,153,0.17)',
  bgCandleDownNear: 'rgba(248,113,113,0.14)',
  bgWick: 'rgba(148,163,184,0.12)',
  grid: 'rgba(120,160,220,0.08)',
  surface: '#e2e8f0',
  up: 'rgba(74,222,128,0.55)', // green day fill
  down: 'rgba(248,113,113,0.55)', // red day fill
  coin: '#fbbf24',
  coinEdge: '#b45309',
  chassis: '#e2e8f0',
  chassisStroke: '#0f172a',
  wheel: '#1e293b',
  wheelRim: '#22c55e', // neon bull-green rim — matches the bike fairing trim

  rider: '#38bdf8',
};
