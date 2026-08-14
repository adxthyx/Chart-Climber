import Matter, { type Body } from 'matter-js';
const { Bodies, Vertices } = Matter;
import type { PricePoint } from '@/lib/data/types';
import {
  CAT_TERRAIN,
  CAT_WHEEL,
  CAT_CHASSIS,
  CAT_HEAD,
  FLOOR_OFFSET,
  FUEL_SPACING,
  MAX_STEP_RETURN,
  PX_PER_RETURN,
  RESAMPLE_SUB,
  RUNWAY_SEGMENTS,
  SEGMENT_W,
  TERRAIN_FRICTION,
  TERRAIN_SMOOTH,
  TERRAIN_TOP,
} from './constants';
import type { Terrain, Vec2 } from './types';

type MappedPoint = Vec2 & { close: number };

// Uniform Catmull-Rom interpolation of one scalar across 4 control values.
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function clampIdx(i: number, n: number): number {
  return i < 0 ? 0 : i >= n ? n - 1 : i;
}

// Subdivide the control polyline so wheels don't catch on single-pixel spikes.
// Subtle on purpose — real jaggedness is the fun.
function resample(ctrl: Vec2[], sub: number): Vec2[] {
  if (sub <= 1 || ctrl.length < 3) return ctrl.slice();
  const n = ctrl.length;
  const out: Vec2[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[clampIdx(i - 1, n)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[clampIdx(i + 2, n)];
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  out.push(ctrl[n - 1]);
  return out;
}

const TERRAIN_OPTS = {
  isStatic: true,
  friction: TERRAIN_FRICTION,
  collisionFilter: {
    category: CAT_TERRAIN,
    mask: CAT_WHEEL | CAT_CHASSIS | CAT_HEAD,
  },
} as const;

export function buildTerrain(points: PricePoint[]): Terrain {
  const closes = points.map((p) => p.close);
  const n = closes.length;
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);

  // Price -> height via CUMULATIVE LOG RETURNS at a fixed vertical scale. Each
  // day's % move becomes the same steepness regardless of the asset's absolute
  // price or total range — a +5% day is always a real hill. This replaces the
  // old global min/max normalization that squashed every move into a fixed band
  // and made large % moves look like tiny bumps. Terrain grows as tall as the
  // cumulative move demands; the camera follows vertically.
  const cum = new Array<number>(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) {
    let r = Math.log(closes[i] / closes[i - 1]);
    if (!Number.isFinite(r)) r = 0; // guard against zero/negative bad ticks
    r = Math.max(-MAX_STEP_RETURN, Math.min(MAX_STEP_RETURN, r));
    cum[i] = cum[i - 1] + r;
  }
  // Higher cumulative return = higher hill = smaller y. Anchor the highest point
  // of the whole climb at TERRAIN_TOP; the surface descends from there.
  const rawY = cum.map((c) => -c * PX_PER_RETURN);
  const minRawY = Math.min(...rawY);
  const dataY = rawY.map((y) => TERRAIN_TOP + (y - minRawY));

  // Flat runway so the bike spawns safely, then the real chart, then a flat tail.
  const mapped: MappedPoint[] = [];
  for (let i = 0; i < RUNWAY_SEGMENTS; i++) {
    mapped.push({ x: i * SEGMENT_W, y: dataY[0], close: closes[0] });
  }
  const dataStartX = RUNWAY_SEGMENTS * SEGMENT_W;
  for (let i = 0; i < n; i++) {
    mapped.push({ x: dataStartX + i * SEGMENT_W, y: dataY[i], close: closes[i] });
  }
  const lastX = mapped[mapped.length - 1].x;
  const lastClose = closes[n - 1];
  for (let i = 1; i <= RUNWAY_SEGMENTS; i++) {
    mapped.push({ x: lastX + i * SEGMENT_W, y: dataY[n - 1], close: lastClose });
  }

  // Optional mild low-pass over the data y's (blend ≤ TERRAIN_SMOOTH) — only trims the
  // sharpest overshoot spikes that catch wheels; the chart's shape/character is kept.
  // The flat runway/tail points are left untouched.
  if (TERRAIN_SMOOTH > 0) {
    const s = Math.min(0.1, TERRAIN_SMOOTH);
    const lo = RUNWAY_SEGMENTS;
    const hi = mapped.length - RUNWAY_SEGMENTS - 1;
    const orig = mapped.map((m) => m.y);
    for (let i = lo; i <= hi; i++) {
      const neighbourAvg = (orig[i - 1] + orig[i + 1]) / 2;
      mapped[i].y = orig[i] * (1 - s) + neighbourAvg * s;
    }
  }

  // Smoothed render/collision surface.
  const surface = resample(
    mapped.map((m) => ({ x: m.x, y: m.y })),
    RESAMPLE_SUB,
  );

  // Floor sits below the lowest point of the surface (unbounded height now).
  const lowestSurfaceY = mapped.reduce((m, p) => (p.y > m ? p.y : m), -Infinity);
  const floorY = lowestSurfaceY + FLOOR_OFFSET;
  const worldWidth = surface[surface.length - 1].x;

  // Per-segment direction for green/red tinting: lower y = higher price = "up".
  const segmentUp: boolean[] = [];
  for (let i = 1; i < surface.length; i++) {
    segmentUp.push(surface[i].y <= surface[i - 1].y);
  }

  // One convex static quad per surface segment, tiled down to the floor.
  // fromVertices recenters vertices around their centroid, so we place the body
  // at that centroid to keep the quad exactly where the surface dictates.
  const bodies: Body[] = [];
  for (let i = 0; i < surface.length - 1; i++) {
    const a = surface[i];
    const b = surface[i + 1];
    const verts: Vec2[] = [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
      { x: b.x, y: floorY },
      { x: a.x, y: floorY },
    ];
    const c = Vertices.centre(verts);
    const body = Bodies.fromVertices(c.x, c.y, [verts], TERRAIN_OPTS);
    bodies.push(body);
  }

  // Coins hover above local price peaks (green-day highs) of the real data.
  const coins: Vec2[] = [];
  const dataPts = mapped.slice(RUNWAY_SEGMENTS, RUNWAY_SEGMENTS + points.length);
  for (let i = 1; i < dataPts.length - 1; i++) {
    const prev = dataPts[i - 1].close;
    const cur = dataPts[i].close;
    const next = dataPts[i + 1].close;
    if (cur > prev && cur >= next) {
      coins.push({ x: dataPts[i].x, y: dataPts[i].y - 55 });
    }
  }

  // Fuel cans spaced evenly along the track so a refill is always reachable
  // before the tank runs dry. Sit each can just above the surface at its x.
  const subW = SEGMENT_W / RESAMPLE_SUB;
  const surfaceYAt = (x: number) => {
    const idx = Math.max(0, Math.min(surface.length - 1, Math.round(x / subW)));
    return surface[idx].y;
  };
  const fuels: Vec2[] = [];
  const fuelStart = dataStartX + FUEL_SPACING * 0.5;
  const fuelEnd = worldWidth - SEGMENT_W * RUNWAY_SEGMENTS;
  for (let x = fuelStart; x < fuelEnd; x += FUEL_SPACING) {
    fuels.push({ x, y: surfaceYAt(x) - 46 });
  }

  // World-x -> price, for the HUD altitude readout (linear interp over data span).
  const dataStart = dataStartX;
  const dataEnd = dataStartX + (points.length - 1) * SEGMENT_W;
  // World-x -> surface slope angle (radians), for grounded pitch stabilization.
  // Sampled from the smoothed collision surface so it matches what the wheels ride.
  const slopeAt = (x: number): number => {
    const idx = Math.max(1, Math.min(surface.length - 1, Math.round(x / subW)));
    const a = surface[idx - 1];
    const b = surface[idx];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };

  const priceAt = (x: number): number => {
    if (x <= dataStart) return closes[0];
    if (x >= dataEnd) return lastClose;
    const f = (x - dataStart) / SEGMENT_W;
    const i = Math.floor(f);
    const frac = f - i;
    return closes[i] + (closes[i + 1] - closes[i]) * frac;
  };

  // World-x -> trading-day timestamp (ms epoch) of the nearest data point, for the
  // HUD date readout. Runway/tail clamp to the first/last day.
  const dateAt = (x: number): number => {
    if (x <= dataStart) return points[0].t;
    if (x >= dataEnd) return points[n - 1].t;
    const i = Math.round((x - dataStart) / SEGMENT_W);
    return points[i].t;
  };

  return {
    bodies,
    surface,
    segmentUp,
    coins,
    fuels,
    worldWidth,
    floorY,
    priceAt,
    dateAt,
    slopeAt,
    minPrice,
    maxPrice,
  };
}
