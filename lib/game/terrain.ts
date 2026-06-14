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
  RESAMPLE_SUB,
  RUNWAY_SEGMENTS,
  SEGMENT_W,
  TERRAIN_HEIGHT,
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
  friction: 0.9,
  collisionFilter: {
    category: CAT_TERRAIN,
    mask: CAT_WHEEL | CAT_CHASSIS | CAT_HEAD,
  },
} as const;

export function buildTerrain(points: PricePoint[]): Terrain {
  const closes = points.map((p) => p.close);
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const span = maxPrice - minPrice || 1;

  // Price -> canvas y: highest price sits at TERRAIN_TOP (highest hill = smallest y).
  const yOf = (close: number) =>
    TERRAIN_TOP + (1 - (close - minPrice) / span) * TERRAIN_HEIGHT;

  // Flat runway so the bike spawns safely, then the real chart, then a flat tail.
  const mapped: MappedPoint[] = [];
  const firstY = yOf(closes[0]);
  for (let i = 0; i < RUNWAY_SEGMENTS; i++) {
    mapped.push({ x: i * SEGMENT_W, y: firstY, close: closes[0] });
  }
  const dataStartX = RUNWAY_SEGMENTS * SEGMENT_W;
  points.forEach((p, i) => {
    mapped.push({ x: dataStartX + i * SEGMENT_W, y: yOf(p.close), close: p.close });
  });
  const lastX = mapped[mapped.length - 1].x;
  const lastClose = closes[closes.length - 1];
  for (let i = 1; i <= RUNWAY_SEGMENTS; i++) {
    mapped.push({ x: lastX + i * SEGMENT_W, y: yOf(lastClose), close: lastClose });
  }

  // Smoothed render/collision surface.
  const surface = resample(
    mapped.map((m) => ({ x: m.x, y: m.y })),
    RESAMPLE_SUB,
  );

  const floorY = TERRAIN_TOP + TERRAIN_HEIGHT + FLOOR_OFFSET;
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
  const priceAt = (x: number): number => {
    if (x <= dataStart) return closes[0];
    if (x >= dataEnd) return lastClose;
    const f = (x - dataStart) / SEGMENT_W;
    const i = Math.floor(f);
    const frac = f - i;
    return closes[i] + (closes[i + 1] - closes[i]) * frac;
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
    minPrice,
    maxPrice,
  };
}
