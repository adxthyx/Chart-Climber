import {
  COLORS,
  HEAD_R,
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
): void {
  const { w, h, accent } = view;
  const cam = engine.camera;

  drawSky(ctx, w, h);
  drawParallax(ctx, w, h, cam.x, view.symbol);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  const left = cam.x - 60;
  const right = cam.x + w + 60;

  drawTerrain(ctx, engine, accent, left, right);
  drawCoins(ctx, engine, left, right);
  drawFuels(ctx, engine, left, right);
  drawBike(ctx, state);

  ctx.restore();
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

function drawBike(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.bike;

  // ── Wheels (drawn behind frame) ──────────────────────────────────────────
  for (const wheel of b.wheels) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(wheel.angle);
    // Tyre
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#0c1525';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();
    // Rim
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R - 5, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.wheelRim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 6 spokes
    ctx.strokeStyle = 'rgba(148,163,184,0.65)';
    ctx.lineWidth = 1.5;
    for (let s = 0; s < 6; s++) {
      const ang = (s / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (WHEEL_R - 6), Math.sin(ang) * (WHEEL_R - 6));
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Motorcycle frame (chassis-local space) ───────────────────────────────
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);

  // Key frame points (chassis-local coords: x right, y down)
  const RAX = -WHEEL_BASE; // rear axle x
  const FAX = WHEEL_BASE;  // front axle x
  const AY = WHEEL_DROP;   // both axles share this y
  const PVTX = -16, PVTY = -3;  // swingarm/frame pivot
  const HX = 28, HY = -20;      // head tube top (steering column)
  const SX = -30, SY = -22;     // seat back

  // Engine block
  roundRect(ctx, -14, -2, 34, 16, 3);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Swingarm: rear axle → frame pivot
  ctx.beginPath();
  ctx.moveTo(RAX, AY);
  ctx.lineTo(PVTX, PVTY);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Fork legs (twin tubes offset ±3 px)
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#64748b';
  ctx.lineCap = 'round';
  for (const off of [-3, 3]) {
    ctx.beginPath();
    ctx.moveTo(HX + off, HY);
    ctx.lineTo(FAX + off, AY);
    ctx.stroke();
  }

  // Main frame spine: pivot → seat → head tube
  ctx.beginPath();
  ctx.moveTo(PVTX, PVTY);
  ctx.lineTo(SX, SY);
  ctx.lineTo(HX, HY);
  ctx.strokeStyle = COLORS.chassis;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Tank/fairing fill between seat and head tube
  ctx.beginPath();
  ctx.moveTo(SX + 4, SY - 1);
  ctx.quadraticCurveTo((SX + HX) / 2, SY - 7, HX - 2, HY + 3);
  ctx.lineTo(HX - 2, HY + 9);
  ctx.quadraticCurveTo((SX + HX) / 2, SY + 3, SX + 4, SY + 5);
  ctx.closePath();
  ctx.fillStyle = COLORS.chassis;
  ctx.strokeStyle = COLORS.chassisStroke;
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();

  // Seat hump
  ctx.beginPath();
  ctx.ellipse(SX + 8, SY - 3, 13, 5, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();

  // Headlight
  ctx.beginPath();
  ctx.arc(HX + 4, HY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fef9c3';
  ctx.fill();

  // Exhaust pipe
  ctx.beginPath();
  ctx.moveTo(RAX + 14, AY + 3);
  ctx.lineTo(RAX - 6, AY + 10);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ── Rider (drawn above frame) ────────────────────────────────────────────
  // Feet/shins to pegs
  ctx.beginPath();
  ctx.moveTo(-22, AY - 2);
  ctx.lineTo(-22, SY + 8);
  ctx.strokeStyle = COLORS.rider;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Torso: seat → handlebars (aggressive lean)
  ctx.beginPath();
  ctx.moveTo(SX + 10, SY + 2);
  ctx.lineTo(HX - 8, HY - 2);
  ctx.strokeStyle = COLORS.rider;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arms to handlebars
  ctx.beginPath();
  ctx.moveTo(HX - 8, HY - 2);
  ctx.lineTo(HX + 2, HY - 8);
  ctx.strokeStyle = COLORS.rider;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  // ── Helmet/head at physics position ─────────────────────────────────────
  ctx.save();
  ctx.translate(b.headX, b.headY);
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.rider;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.chassisStroke;
  ctx.stroke();
  // Visor strip
  ctx.beginPath();
  ctx.arc(0, 2, HEAD_R - 3, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = 'rgba(14,165,233,0.55)';
  ctx.lineWidth = 2;
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
