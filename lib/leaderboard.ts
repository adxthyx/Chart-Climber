import type { Range } from '@/lib/data/types';
import { withBasePath } from '@/lib/basePath';

export const MAX_NAME_LENGTH = 24;
export const LEADERBOARD_SIZE = 10;

export type LeaderboardEntry = {
  id: number;
  name: string;
  score: number;
  distance: number;
  coins: number;
  finished: boolean;
  createdAt: number; // ms epoch
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  enabled: boolean; // false when the server has no DATABASE_URL
};

export type SubmitScorePayload = {
  symbol: string;
  range: Range;
  name: string; // empty string = anonymous
  score: number;
  distance: number;
  coins: number;
  finished: boolean;
};

export type SubmitScoreResponse = LeaderboardResponse & {
  rank: number; // 1-based rank of the submitted run, 0 when disabled/failed
};

export async function fetchLeaderboard(symbol: string, range: Range): Promise<LeaderboardResponse> {
  try {
    const res = await fetch(withBasePath(`/api/leaderboard?symbol=${encodeURIComponent(symbol)}&range=${range}`));
    if (!res.ok) throw new Error(`leaderboard ${res.status}`);
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return { entries: [], enabled: false };
  }
}

export async function submitScore(payload: SubmitScorePayload): Promise<SubmitScoreResponse> {
  try {
    const res = await fetch(withBasePath('/api/leaderboard'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`leaderboard ${res.status}`);
    return (await res.json()) as SubmitScoreResponse;
  } catch {
    return { entries: [], enabled: false, rank: 0 };
  }
}
