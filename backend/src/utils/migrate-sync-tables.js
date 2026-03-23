'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }, // Explicitly allow unauthorized for Supabase/Render
});

async function migrate() {
  console.log('--- Starting DB Migration for Sync System ---');
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to DB successfully.');

    await client.query('BEGIN');

    // Update Match table
    await client.query(`
      ALTER TABLE "Match" 
      ADD COLUMN IF NOT EXISTS "league_name" TEXT,
      ADD COLUMN IF NOT EXISTS "lineup_status" TEXT DEFAULT 'out',
      ADD COLUMN IF NOT EXISTS "lineup_json" JSONB,
      ADD COLUMN IF NOT EXISTS "api_id" TEXT,
      ADD COLUMN IF NOT EXISTS "series_id" TEXT,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('- "Match" table updated.');

    // Update Player table
    await client.query(`
      ALTER TABLE "Player" 
      ADD COLUMN IF NOT EXISTS "player_id" TEXT,
      ADD COLUMN IF NOT EXISTS "team_name" TEXT,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    // Ensure UNIQUE(player_id)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_player_id_key') THEN
          ALTER TABLE "Player" ADD CONSTRAINT "player_player_id_key" UNIQUE ("player_id");
        END IF;
      END $$;
    `);
    console.log('- "Player" table updated with unique constraint.');

    // Create LiveScore table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LiveScore" (
        "id" SERIAL PRIMARY KEY,
        "matchId" INTEGER REFERENCES "Match"(id) ON DELETE CASCADE,
        "runs" INTEGER DEFAULT 0,
        "wickets" INTEGER DEFAULT 0,
        "overs" DECIMAL(4,1) DEFAULT 0.0,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('- "LiveScore" table ensured.');

    // Update MatchSquad unique constraint
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matchsquad_match_player_key') THEN
          ALTER TABLE "MatchSquad" ADD CONSTRAINT "matchsquad_match_player_key" UNIQUE ("matchId", "playerId");
        END IF;
      END $$;
    `);
    console.log('- "MatchSquad" table updated with unique constraint.');

    // Create PlayerPoint table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PlayerPoint" (
        "id" SERIAL PRIMARY KEY,
        "playerId" INTEGER REFERENCES "Player"(id) ON DELETE CASCADE,
        "matchId" INTEGER REFERENCES "Match"(id) ON DELETE CASCADE,
        "points" DECIMAL(10,2) DEFAULT 0.0,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("playerId", "matchId")
      );
    `);
    console.log('- "PlayerPoint" table ensured.');

    await client.query('COMMIT');
    console.log('--- Migration Successful ---');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('--- Migration Failed ---');
    console.error('Error Trace:', err);
  } finally {
    if (client) client.release();
    pool.end();
  }
}

migrate();
