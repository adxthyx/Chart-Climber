// Central tuning. Change feel here, not in the physics/render modules.

// --- Physics ---
export const GRAVITY = 1.4; // Matter world gravity scale
//
// DRIVE — genuine TORQUE-based all-wheel drive (no kinematic velocity overrides).
// Real motor torque is applied to BOTH wheels; the Matter solver turns it into
// forward motion through contact friction, so acceleration is load-dependent (it
// bogs on climbs, the tyre can slip), the chassis gets a real pitch reaction
// (wheelies are possible), and the bike CAN tip over and crash. Nothing here forces
// a wheel spin or a chassis angle.
// Magnitude note: Matter integrates torque as Δangle += (torque/inertia)·dt², and at
// 60fps dt²≈278, so raw coefficients are tiny. applyEngineTorque scales by the
// wheel's own inertia (against WHEEL_INERTIA_REF) so the FEEL is independent of wheel
// mass — this is just a units convention, not a kinematic drive.
export const MOTOR_TORQUE = 0.2; // rear-wheel drive torque at full throttle (real torque, inertia-scaled)
export const FRONT_DRIVE_RATIO = 0.12; // front wheel gets 12% of rear power → traction so it never stalls in dips / over crests
export const MAX_WHEEL_SPIN = 11; // rad/step where drive torque tapers to 0 → natural top speed
export const WHEEL_INERTIA_REF = 300; // reference wheel inertia applyEngineTorque scales against (mass/frame-independent torque)
export const THROTTLE_RAMP = 3.5; // throttle units/sec the smoothed throttle eases up & down → smooth power delivery
export const BRAKE_TORQUE = 0.0016; // brake torque magnitude (firm pull toward a stop on both wheels)
export const REVERSE_TORQUE = 0.0005; // steady reverse drive once stopped under brake
// Wheel↔terrain grip. Matter pair friction = min(wheel, terrain), and a slope of
// angle θ needs μ > tan(θ) for the driven tyre to climb (not just cling). The chart's
// steepest faces approach ~49°, tan49≈1.15, so keep BOTH ≥ ~1.5 to climb with margin.
// AWD: both wheels are driven AND grip.
export const WHEEL_FRICTION = 1.6;
export const WHEEL_FRICTION_STATIC = 1.8; // high static grip so the tyre bites from a standstill on a wall
export const TERRAIN_FRICTION = 1.6;
export const SUSPENSION_STIFFNESS = 0.9; // firmer axle; reduces horizontal wobble
// Pitch torque applied to the chassis on input — this is what makes wheelies and
// flips possible (gas pitches the nose up, brake pitches it down). Over-rotating
// in the air lands you on the rider's head = crash. Tuned to chassis inertia.
export const PITCH_TORQUE = 0.1; // air-only pitch control authority (flips / leveling for landing)
export const PITCH_INERTIA_REF = 10000; // reference inertia the pitch/balance torques scale against (frame-rate-independent)
// Grounded anti-tumble — a SOFT, OVERPOWERABLE balance assist (rider weight shift),
// NOT a kinematic slope-lock. balanceChassis() adds a CAPPED PD torque toward the
// terrain slope: it settles the bike on normal/moderate grades, but flooring the
// throttle on a steep wall overwhelms it → real wheelie → backflip → crash. This is
// what re-enables game-over on the ground. See balanceChassis() in bike.ts.
export const BALANCE_KP = 2.6; // proportional gain toward terrain slope
export const BALANCE_KD = 2.4; // strong derivative gain — actively damps fast spin so incipient loops are caught (rider resisting a flip)
export const BALANCE_MAX_TORQUE = 1.4; // hard cap on the assist → finite authority, can still be overpowered into a flip
// Anti-wheelie power easing: when the nose pitches above the terrain slope under power,
// drive torque is eased down so the bike can't drive itself into a backflip on a climb.
// Pure physics (just less torque — gravity/momentum/air can still flip & crash you), and
// it mirrors how a rider/throttle backs off a wheelie. Eases between these pitch errors.
export const WHEELIE_EASE_START = 0.6; // rad of nose-up-vs-slope where power begins to ease (~34°) — past normal climbing pitch
export const WHEELIE_EASE_FULL = 1.2; // rad where power reaches its floor (~69°)
export const WHEELIE_MIN_POWER = 0.4; // throttle floor retained at full wheelie (still real grunt to keep climbing)

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
export const HEAD_OFFSET_Y = 18; // rider head height above chassis center (raises CG) — lowered to resist backward looping under power

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
