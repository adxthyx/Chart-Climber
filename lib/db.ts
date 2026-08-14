import { neon } from '@neondatabase/serverless';

// Neon serverless Postgres. Optional: without DATABASE_URL the leaderboard
// endpoints degrade gracefully (empty board, submits rejected) — the game
// itself never depends on the DB.
type Sql = ReturnType<typeof neon>;

let sql: Sql | null = null;
let schemaReady: Promise<void> | null = null;

export function getDb(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql ??= neon(url);
  return sql;
}

// Idempotent, run once per server instance before the first query.
export function ensureSchema(db: Sql): Promise<void> {
  schemaReady ??= (async () => {
    await db`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        symbol     TEXT NOT NULL,
        range      TEXT NOT NULL,
        name       TEXT NOT NULL DEFAULT 'Anonymous',
        score      INTEGER NOT NULL,
        distance   REAL NOT NULL DEFAULT 0,
        coins      INTEGER NOT NULL DEFAULT 0,
        finished   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS leaderboard_rank_idx
      ON leaderboard (symbol, range, score DESC)
    `;
  })();
  return schemaReady;
}
