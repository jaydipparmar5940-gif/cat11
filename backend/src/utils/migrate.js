/**
 * migrate.js — One-time schema migration
 * Adds playerImg, cricApiId columns and unique indexes
 */
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '5940',
  database: process.env.DB_NAME || 'fantasy_cricket_db'
});

async function migrate() {
  await client.connect();
  console.log('[MIGRATE] Connected');

  const steps = [
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "playerImg" TEXT`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "cricApiId" TEXT`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "selectionPercentage" DECIMAL(5,1) DEFAULT 0`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "isPlaying" BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE "Match"  ADD COLUMN IF NOT EXISTS "cricApiId" TEXT`,
  ];

  for (const sql of steps) {
    try { await client.query(sql); console.log('[MIGRATE] OK:', sql.substring(0, 50)); }
    catch (e) { console.log('[MIGRATE] Skip:', e.message.substring(0, 60)); }
  }

  // Unique index on Player(name, teamId) — needed for ON CONFLICT
  try {
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS player_name_team_idx ON "Player"(name, "teamId")`);
    console.log('[MIGRATE] Unique index player_name_team_idx created');
  } catch (e) { console.log('[MIGRATE] Index:', e.message.substring(0, 80)); }

  // Unique index on Match(cricApiId)
  try {
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS match_cricapi_id_idx ON "Match"("cricApiId") WHERE "cricApiId" IS NOT NULL`);
    console.log('[MIGRATE] Unique index match_cricapi_id_idx created');
  } catch (e) { console.log('[MIGRATE] Match idx:', e.message.substring(0, 80)); }

  console.log('[MIGRATE] ✅ Done');
  await client.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
