import { NextResponse } from 'next/server';
import { ASSET_BY_SYMBOL } from '@/lib/data/assets';
import { RANGES, type Range } from '@/lib/data/types';
import { ensureSchema, getDb } from '@/lib/db';
import {
  LEADERBOARD_SIZE,
  MAX_NAME_LENGTH,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type SubmitScoreResponse,
} from '@/lib/leaderboard';

type Row = {
  id: number;
  name: string;
  score: number;
  distance: number;
  coins: number;
  finished: boolean;
  created_at: string;
};

function toEntry(r: Row): LeaderboardEntry {
  return {
    id: Number(r.id),
    name: r.name,
    score: r.score,
    distance: r.distance,
    coins: r.coins,
    finished: r.finished,
    createdAt: new Date(r.created_at).getTime(),
  };
}

async function topEntries(
  db: NonNullable<ReturnType<typeof getDb>>,
  symbol: string,
  range: Range,
): Promise<LeaderboardEntry[]> {
  const rows = (await db`
    SELECT id, name, score, distance, coins, finished, created_at
    FROM leaderboard
    WHERE symbol = ${symbol} AND range = ${range}
    ORDER BY score DESC, created_at ASC
    LIMIT ${LEADERBOARD_SIZE}
  `) as Row[];
  return rows.map(toEntry);
}

function parseKey(symbol: string, rawRange: string): { symbol: string; range: Range } | null {
  if (!ASSET_BY_SYMBOL[symbol]) return null;
  if (!RANGES.includes(rawRange as Range)) return null;
  return { symbol, range: rawRange as Range };
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const key = parseKey(searchParams.get('symbol') ?? '', searchParams.get('range') ?? '');
  if (!key) return NextResponse.json({ error: 'unknown symbol or range' }, { status: 404 });

  const db = getDb();
  if (!db) return NextResponse.json({ entries: [], enabled: false } satisfies LeaderboardResponse);

  try {
    await ensureSchema(db);
    const entries = await topEntries(db, key.symbol, key.range);
    return NextResponse.json({ entries, enabled: true } satisfies LeaderboardResponse);
  } catch {
    return NextResponse.json({ entries: [], enabled: false } satisfies LeaderboardResponse);
  }
}

// Clamp to sane bounds so a hand-crafted request can't overflow the columns.
function toInt(v: unknown, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n), max);
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const key = parseKey(String(body.symbol ?? ''), String(body.range ?? ''));
  const score = toInt(body.score, 1_000_000_000);
  const distance = toInt(body.distance, 1_000_000);
  const coins = toInt(body.coins, 100_000);
  if (!key || score === null || distance === null || coins === null) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  // Name is optional — blank submits as Anonymous.
  const name =
    String(body.name ?? '')
      .replace(/[\p{C}]/gu, '')
      .trim()
      .slice(0, MAX_NAME_LENGTH) || 'Anonymous';
  const finished = body.finished === true;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ entries: [], enabled: false, rank: 0 } satisfies SubmitScoreResponse);
  }

  try {
    await ensureSchema(db);
    await db`
      INSERT INTO leaderboard (symbol, range, name, score, distance, coins, finished)
      VALUES (${key.symbol}, ${key.range}, ${name}, ${score}, ${distance}, ${coins}, ${finished})
    `;
    const [{ better }] = (await db`
      SELECT COUNT(*)::int AS better
      FROM leaderboard
      WHERE symbol = ${key.symbol} AND range = ${key.range} AND score > ${score}
    `) as [{ better: number }];
    const entries = await topEntries(db, key.symbol, key.range);
    return NextResponse.json({ entries, enabled: true, rank: better + 1 } satisfies SubmitScoreResponse);
  } catch {
    return NextResponse.json({ entries: [], enabled: false, rank: 0 } satisfies SubmitScoreResponse);
  }
}
