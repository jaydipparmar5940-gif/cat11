/**
 * minimal-sync.js
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = require('./src/services/sync/rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- Minimal Sync Starting ---');
  try {
    // 1. Hardcoded Match/Series for testing
    // ICC Men's T20 World Cup Sub Regional Qualifier B (ID 7607)
    // Match ID 102435 (Germany vs Jersey)
    
    const matchId = '102435';
    const seriesId = '7607';

    // Get Team IDs
    const upsertT = async (n) => {
      let r = await pool.query('SELECT id FROM "Team" WHERE name = $1', [n]);
      if (!r.rows.length) {
        r = await pool.query('INSERT INTO "Team" (name, "shortName") VALUES ($1, $2) RETURNING id', [n, n.slice(0,3).toUpperCase()]);
      }
      return r.rows[0].id;
    };
    
    const tA = await upsertT('Germany');
    const tB = await upsertT('Jersey');

    const mRes = await pool.query(`
      INSERT INTO "Match" ("api_id", "series_id", "teamAId", "teamBId", "matchStartTime", "status", "league_name")
      VALUES ($1, $2, $3, $4, NOW(), 'UPCOMING', 'ICC T20 WC Qualifier')
      ON CONFLICT ("api_id") DO UPDATE SET "updated_at" = NOW()
      RETURNING id;
    `, [matchId, seriesId, tA, tB]);
    
    const dbMatchId = mRes.rows[0].id;
    console.log(`Match ${matchId} created/updated (ID: ${dbMatchId}).`);

    // 2. Fetch Squad for ONE Team (Germany Squad ID 43818 or similar)
    // Actually I'll use /series/v1/7607/squads and just take the first one
    const sRes = await client.get(`/series/v1/${seriesId}/squads`);
    const squad = sRes.data.squads.find(x => !x.isHeader);
    
    if (squad) {
      console.log(`Fetching players for ${squad.squadType} (ID: ${squad.squadId})...`);
      const pRes = await client.get(`/series/v1/${seriesId}/squads/${squad.squadId}`);
      const players = pRes.data.players || [];
      
      const dbTeamId = await upsertT(squad.squadType);

      for (const p of players) {
        const plRes = await pool.query(`
          INSERT INTO "Player" ("player_id", "name", "role", "team_name", "teamId")
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT ("player_id") DO UPDATE SET "updated_at" = NOW()
          RETURNING id;
        `, [String(p.id), p.name, p.role || 'BAT', squad.squadType, dbTeamId]);
        
        await pool.query('INSERT INTO "MatchSquad" ("matchId", "playerId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [dbMatchId, plRes.rows[0].id]);
      }
      console.log(`Synced ${players.length} players for match ${matchId}.`);
    }

  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

run();
