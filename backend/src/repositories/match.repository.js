const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const MATCH_SELECT = `
  SELECT 
    m.id                                        AS match_id,
    t1.name                                     AS team_a,
    t2.name                                     AS team_b,
    m."matchStartTime"                          AS match_time,
    m.status,
    COALESCE(m.venue, '')                       AS venue,
    m.api_id,
    json_build_object(
      'id',        t1.id,
      'shortName', COALESCE(t1."shortName", UPPER(SUBSTRING(t1.name, 1, 3))),
      'logo',      COALESCE(t1.logo, 'https://via.placeholder.com/40')
    ) AS team_a_info,
    json_build_object(
      'id',        t2.id,
      'shortName', COALESCE(t2."shortName", UPPER(SUBSTRING(t2.name, 1, 3))),
      'logo',      COALESCE(t2.logo, 'https://via.placeholder.com/40')
    ) AS team_b_info
  FROM "Match" m
  JOIN "Team" t1 ON m."teamAId" = t1.id
  JOIN "Team" t2 ON m."teamBId" = t2.id
`;

exports.getUpcomingMatches = async () => {
  const res = await pool.query(`
    ${MATCH_SELECT}
    WHERE m.status = 'UPCOMING'
    ORDER BY m."matchStartTime" ASC
  `);
  return res.rows;
};

exports.getAllMatchesWithStatus = async (status) => {
  let query = MATCH_SELECT;
  if (status) {
    query += ` WHERE m.status = '${status}'`;
  }
  query += ` ORDER BY m."matchStartTime" ASC`;
  const res = await pool.query(query);
  return res.rows;
};

exports.getMatchDetails = async (matchId) => {
  const id = parseInt(matchId);
  const res = await pool.query(`
    ${MATCH_SELECT}
    WHERE m.id = ${id}
  `);
  return res.rows;
};

exports.getMatchPlayersByMatchId = async (matchId) => {
  const id = parseInt(matchId);
  const res = await pool.query(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(p."imageUrl", '') AS image
    FROM "Player" p
    JOIN "Team" t ON p."teamId" = t.id
    JOIN "Match" m ON (m."teamAId" = t.id OR m."teamBId" = t.id)
    WHERE m.id = ${id}
    ORDER BY p.role ASC, p.name ASC
  `);
  return res.rows;
};

exports.getMatchSquad = async (matchId) => {
  const id = parseInt(matchId);
  const squad = await pool.query(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(p."imageUrl", '') AS image
    FROM "MatchSquad" s
    JOIN "Player" p ON s."playerId" = p.id
    JOIN "Team" t ON p."teamId" = t.id
    WHERE s."matchId" = ${id}
    ORDER BY p.role ASC, p.name ASC
  `);

  if (!squad.rows || squad.rows.length === 0) {
    return await this.getMatchPlayersByMatchId(id);
  }
  return squad.rows;
};

exports.getMatchContext = async (matchId) => {
  const id = parseInt(matchId);
  const res = await pool.query(`
    SELECT id FROM "Match" WHERE id = ${id} LIMIT 1
  `);
  return res.rows;
};

exports.getMatchContests = async (matchId) => {
  const id = parseInt(matchId);
  const res = await pool.query(`
    SELECT 
      c.id, c."entryFee", c."totalSpots", c."joinedSpots", c."prizePool", c.status,
      CASE
        WHEN c."entryFee" = 0 THEN 'Practice Contest'
        WHEN c."totalSpots" >= 500000 THEN 'Mega Contest'
        WHEN c."totalSpots" <= 2 THEN 'Head To Head'
        WHEN c."totalSpots" <= 50 THEN 'Small League'
        ELSE 'Other Contests'
      END as "contestName"
    FROM "Contest" c
    WHERE c."matchId" = ${id}
    ORDER BY c."prizePool" DESC
  `);

  return res.rows.map(r => ({
    ...r,
    entryFee: parseFloat(r.entryFee) || 0,
    prizePool: parseFloat(r.prizePool) || 0
  }));
};
