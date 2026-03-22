require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkPlayers() {
  try {
    const resCount = await pool.query('SELECT COUNT(*) FROM "public"."Player"');
    console.log('PLAYER COUNT:', resCount.rows[0].count);

    const resSample = await pool.query(`
      SELECT p.name, p.role, t.name as team
      FROM "public"."Player" p
      JOIN "public"."Team" t ON p."teamId" = t.id
      LIMIT 5
    `);
    console.log('SAMPLE PLAYERS:');
    resSample.rows.forEach(r => console.log(`- ${r.name} (${r.role}) [${r.team}]`));

    const resMatch = await pool.query('SELECT id FROM "public"."Match" LIMIT 1');
    if (resMatch.rows.length > 0) {
        const matchId = resMatch.rows[0].id;
        const resPlayers = await pool.query(`
            SELECT COUNT(*) 
            FROM "public"."Player" p
            WHERE p."teamId" IN (
                SELECT "teamAId" FROM "public"."Match" WHERE id = $1
                UNION
                SELECT "teamBId" FROM "public"."Match" WHERE id = $1
            )
        `, [matchId]);
        console.log(`PLAYERS FOR MATCH ${matchId}:`, resPlayers.rows[0].count);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

checkPlayers();
