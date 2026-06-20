import {
  COLORS,
  WHEEL_BASE,
  WHEEL_DROP,
  WHEEL_R,
} from './constants';
import type { GameEngine } from './engine';
import type { GameState } from './types';

export type RenderView = {
  w: number; // CSS pixels
  h: number;
  accent: string;
  symbol: string;
};

// Single entry point. Assumes ctx is already scaled for devicePixelRatio so all
// drawing happens in CSS pixels. Camera is applied as a world->screen translate.
export function draw(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  state: GameState,
  view: RenderView,
  alpha = 1,
): void {
  const { w, h, accent } = view;
  const cam = engine.getCamera(alpha);

  drawSky(ctx, w, h);
  drawParallax(ctx, w, h, cam.x, view.symbol);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  const left = cam.x - 60;
  const right = cam.x + w + 60;

  drawTerrain(ctx, engine, accent, left, right);
  drawCoins(ctx, engine, left, right);
  drawFuels(ctx, engine, left, right);
  updateAndDrawDust(ctx, state);
  drawSpeedLines(ctx, state);
  drawBike(ctx, state, view);

  ctx.restore();
}

// Faint horizontal streaks trailing the bike at speed — cheap sense of velocity.
function drawSpeedLines(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.bike;
  if (b.speed < 9) return;
  const intensity = Math.min(1, (b.speed - 9) / 14);
  const dir = b.wheels[0].x <= b.wheels[1].x ? -1 : 1; // trail behind travel direction
  ctx.save();
  ctx.strokeStyle = `rgba(226,232,240,${0.12 * intensity})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const ly = b.y - 30 + i * 14 + (i % 2) * 3;
    const len = 24 + (i * 13) % 30 + intensity * 26;
    const sx = b.x + dir * 36;
    ctx.beginPath();
    ctx.moveTo(sx, ly);
    ctx.lineTo(sx + dir * len, ly);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Dirt/dust particle system (cosmetic, renderer-owned) ───────────────────────
// Kicked up by the rear wheel when driving on the ground. Lives entirely in the
// renderer — no physics coupling — and is integrated on wall-clock dt each frame.
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
const dust: Particle[] = [];
let lastDustT = 0;

function updateAndDrawDust(ctx: CanvasRenderingContext2D, state: GameState) {
  const now = performance.now();
  const dt = lastDustT ? Math.min(0.05, (now - lastDustT) / 1000) : 0;
  lastDustT = now;
  const b = state.bike;

  // Emit when grounded and the rear wheel is spinning under power (forward drive).
  const rear = b.wheels[0];
  const driving = !b.airborne && b.rearSpin > 0.4 && b.speed > 1.2;
  if (driving && dust.length < 140) {
    const count = Math.min(4, 1 + Math.floor(b.rearSpin));
    for (let i = 0; i < count; i++) {
      dust.push({
        x: rear.x + (Math.random() - 0.5) * 8,
        y: rear.y + WHEEL_R * 0.7,
        vx: -b.speed * (0.3 + Math.random() * 0.4) - 0.5, // flung backward
        vy: -(0.5 + Math.random() * 1.8), // and up
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        r: 2 + Math.random() * 3,
      });
    }
  }

  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p.life -= dt;
    if (p.life <= 0) {
      dust.splice(i, 1);
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 9 * dt; // gravity (world px/s²-ish, scaled to step feel)
    p.vx *= 0.96;
    const a = Math.max(0, p.life / p.max);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.6 + a * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,150,110,${a * 0.5})`;
    ctx.fill();
  }
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Faint trading-terminal grid + big ticker watermark, slow-parallaxed.
function drawParallax(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, symbol: string) {
  ctx.save();
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const spacing = 80;
  const offset = (-camX * 0.4) % spacing;
  ctx.beginPath();
  for (let x = offset; x < w; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.font = '900 140px var(--font-mono), monospace';
  ctx.fillStyle = 'rgba(148,163,184,0.05)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const driftX = ((-camX * 0.15) % (w + 400)) + w / 2;
  ctx.fillText(symbol, driftX, h * 0.32);
  ctx.font = '700 16px var(--font-mono), monospace';
  ctx.fillStyle = 'rgba(251,191,36,0.18)';
  ctx.fillText('ILLUSTRATIVE', driftX, h * 0.32 + 92);
  ctx.restore();
}

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  accent: string,
  left: number,
  right: number,
) {
  const { surface, segmentUp, floorY } = engine.terrain;

  // Base gradient fill (accent -> transparent) under the whole visible surface.
  const top = surface[0] ? surface[0].y : 0;
  const grad = ctx.createLinearGradient(0, top - 40, 0, floorY);
  grad.addColorStop(0, hexToRgba(accent, 0.45));
  grad.addColorStop(1, hexToRgba(accent, 0.02));

  ctx.beginPath();
  ctx.moveTo(surface[0].x, surface[0].y);
  for (let i = 1; i < surface.length; i++) {
    ctx.lineTo(surface[i].x, surface[i].y);
  }
  ctx.lineTo(surface[surface.length - 1].x, floorY);
  ctx.lineTo(surface[0].x, floorY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Per-segment green/red tint band near the surface (culled to viewport).
  for (let i = 1; i < surface.length; i++) {
    const a = surface[i - 1];
    const b = surface[i];
    if (b.x < left || a.x > right) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, floorY);
    ctx.lineTo(a.x, floorY);
    ctx.closePath();
    ctx.fillStyle = segmentUp[i - 1] ? COLORS.up : COLORS.down;
    ctx.fill();
  }

  // Crisp surface stroke on top.
  ctx.beginPath();
  ctx.moveTo(surface[0].x, surface[0].y);
  for (let i = 1; i < surface.length; i++) {
    if (surface[i].x < left || surface[i].x > right) continue;
    ctx.lineTo(surface[i].x, surface[i].y);
  }
  ctx.strokeStyle = COLORS.surface;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawCoins(ctx: CanvasRenderingContext2D, engine: GameEngine, left: number, right: number) {
  const t = performance.now() / 1000;
  for (const coin of engine.coins) {
    if (coin.x < left || coin.x > right) continue;
    if (coin.collected && coin.pop >= 1) continue;

    let scale = 1;
    let alpha = 1;
    if (coin.collected) {
      coin.pop = Math.min(1, coin.pop + 0.06);
      scale = 1 + coin.pop * 1.4;
      alpha = 1 - coin.pop;
    }
    // Spin: squash horizontally on a sine to fake a rotating coin.
    const sx = Math.abs(Math.cos(t * 4 + coin.x * 0.01)) * 0.85 + 0.15;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(coin.x, coin.y);
    ctx.scale(sx * scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.coin;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.coinEdge;
    ctx.stroke();
    ctx.restore();
  }
}

function drawFuels(ctx: CanvasRenderingContext2D, engine: GameEngine, left: number, right: number) {
  const t = performance.now() / 1000;
  for (const can of engine.fuels) {
    if (can.x < left || can.x > right) continue;
    if (can.collected && can.pop >= 1) continue;

    let scale = 1;
    let alpha = 1;
    if (can.collected) {
      can.pop = Math.min(1, can.pop + 0.06);
      scale = 1 + can.pop * 1.4;
      alpha = 1 - can.pop;
    }
    const bob = Math.sin(t * 2 + can.x * 0.01) * 3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(can.x, can.y + bob);
    ctx.scale(scale, scale);
    // Jerry can body.
    roundRect(ctx, -can.r * 0.7, -can.r, can.r * 1.4, can.r * 2, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#064e3b';
    ctx.stroke();
    // Spout.
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(can.r * 0.2, -can.r - 4, 5, 5);
    // Label.
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '800 15px var(--font-mono), monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', 0, 1);
    ctx.restore();
  }
}

// ── Bike sprite ────────────────────────────────────────────────────────────────
// The body is a single illustrated dirtbike image (public/bike.svg) rotated at the
// chassis; the two wheels are drawn separately so they spin. The SVG was authored with
// its axles at (50,110) and (170,110) in a 220×150 viewBox — these map the image onto
// the physics wheelbase.
const SPR_AXLE_L = 50;
const SPR_AXLE_R = 170;
const SPR_VBW = 220;
const SPR_VBH = 150;
const SPR_MIDX = (SPR_AXLE_L + SPR_AXLE_R) / 2;
const SPR_MIDY = 110; // axle line y
const SPR_SCALE = (WHEEL_BASE * 2) / (SPR_AXLE_R - SPR_AXLE_L);

let bikeImg: HTMLImageElement | null = null;
let bikeReady = false;
function ensureBikeImg() {
  if (bikeImg || typeof window === 'undefined' || typeof Image === 'undefined') return;
  bikeImg = new Image();
  bikeImg.onload = () => { bikeReady = true; };
  bikeImg.src = '/bike.svg';
}

function drawBike(ctx: CanvasRenderingContext2D, state: GameState, view: RenderView) {
  ensureBikeImg();
  const b = state.bike;

  drawWheels(ctx, b);

  if (bikeReady && bikeImg) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(
      bikeImg,
      -SPR_MIDX * SPR_SCALE,
      -SPR_MIDY * SPR_SCALE + WHEEL_DROP,
      SPR_VBW * SPR_SCALE,
      SPR_VBH * SPR_SCALE,
    );
    // Ticker on the side number plate (sprite plate centred ≈ (41,69)).
    const px = (41 - SPR_MIDX) * SPR_SCALE;
    const py = (69 - SPR_MIDY) * SPR_SCALE + WHEEL_DROP;
    ctx.fillStyle = view.accent;
    ctx.font = '800 9px var(--font-mono), monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(view.symbol.slice(0, 4), px, py);
    ctx.restore();
  } else {
    drawBikeVectorBody(ctx, b);
  }
}

// Knobby off-road tyres at each wheel's physics position (spins with wheel.angle).
function drawWheels(ctx: CanvasRenderingContext2D, b: GameState['bike']) {
  for (const wheel of b.wheels) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(wheel.angle);
    // Tyre carcass
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1220';
    ctx.fill();
    // Knobby tread blocks around the rim
    ctx.fillStyle = '#1e293b';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(WHEEL_R - 4, -2.4, 5, 4.8);
      ctx.restore();
    }
    // Rim + hub
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R - 6, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.wheelRim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    // Spokes
    ctx.strokeStyle = 'rgba(148,163,184,0.6)';
    ctx.lineWidth = 1.3;
    for (let s = 0; s < 6; s++) {
      const ang = (s / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (WHEEL_R - 6), Math.sin(ang) * (WHEEL_R - 6));
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Fallback body (used only until the sprite image finishes loading).
function drawBikeVectorBody(ctx: CanvasRenderingContext2D, b: GameState['bike']) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  const SX = -30, SY = -22, HX = 28, HY = -20;
  roundRect(ctx, -14, -2, 34, 16, 3);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.lineTo(SX, SY);
  ctx.lineTo(HX, HY);
  ctx.strokeStyle = COLORS.chassis;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
