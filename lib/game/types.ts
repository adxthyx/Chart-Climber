import type { Body } from 'matter-js';

export type Vec2 = { x: number; y: number };

// Output of terrain construction: physics bodies + everything the renderer needs.
export type Terrain = {
  bodies: Body[]; // tiled static ground quads
  surface: Vec2[]; // the surface polyline (world coords)
  segmentUp: boolean[]; // per-segment direction: close[i] >= close[i-1]
  coins: Vec2[]; // coin world positions
  fuels: Vec2[]; // fuel-can world positions
  worldWidth: number;
  floorY: number; // y of the solid floor (bottom of every quad)
  // Maps a world x to the underlying price, for the HUD altitude readout.
  priceAt: (x: number) => number;
  // Maps a world x to the surface slope angle (rad), for pitch stabilization.
  slopeAt: (x: number) => number;
  minPrice: number;
  maxPrice: number;
};

export type Input = { gas: boolean; brake: boolean };

// Immutable snapshot consumed by renderer + HUD each frame.
export type GameState = {
  bike: {
    x: number;
    y: number;
    angle: number;
    speed: number; // px/step magnitude of chassis velocity
    airborne: boolean;
    rearSpin: number; // rear-wheel angular velocity (rad/step) — drives dust intensity / motion fx
    wheels: { x: number; y: number; angle: number }[];
    headX: number;
    headY: number;
  };
  distance: number; // max world-x reached, in px
  fuel: number; // 0..FUEL_MAX
  coinsCollected: number;
  score: number;
  price: number; // price under the bike
  over: boolean;
  finished: boolean; // reached the end of the chart
  reason: 'crash' | 'fuel' | 'fell' | null;
  flips: number; // full mid-air flips completed this run
};

// A collectible coin with pickup + pop-animation state (read by the renderer).
export type Coin = {
  x: number;
  y: number;
  r: number;
  collected: boolean;
  pop: number; // 0..1 pop progress after collection, -1 before
};
