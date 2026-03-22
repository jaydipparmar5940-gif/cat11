const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  FROM "public"."Match" m
  JOIN "public"."Team" t1 ON m."teamAId" = t1.id
  JOIN "public"."Team" t2 ON m."teamBId" = t2.id
`;

const PLAYERS_SELECT = `
  SELECT
    p.id,
    p.name,
    p.role,
    COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team,
    COALESCE(p."imageUrl", '') AS image
  FROM "public"."Player" p
  JOIN "public"."Team" t ON p."teamId" = t.id
`;

exports.getUpcomingMatches = async () => {
  const { rows } = await pool.query(
    `${MATCH_SELECT} WHERE m.status = 'UPCOMING' ORDER BY m."matchStartTime" ASC`
  );
  return rows;
};

exports.getMatchDetails = async (matchId) => {
  const { rows } = await pool.query(`${MATCH_SELECT} WHERE m.id = $1`, [matchId]);
  return rows;
};

exports.getMatchPlayersByMatchId = async (matchId) => {
  const { rows } = await pool.query(
    `${PLAYERS_SELECT}
     WHERE p."teamId" IN (
       SELECT "teamAId" FROM "public"."Match" WHERE id = $1
       UNION
       SELECT "teamBId" FROM "public"."Match" WHERE id = $1
     )
     ORDER BY p.role ASC, p.name ASC`,
    [matchId]
  );
  return rows;
};

exports.getMatchSquad = async (matchId) => {
  const { rows } = await pool.query(
    `${PLAYERS_SELECT}
     JOIN "public"."MatchSquad" ms ON ms."playerId" = p.id
     WHERE ms."matchId" = $1
     ORDER BY p.role ASC, p.name ASC`,
    [matchId]
  );
  return rows;
};

exports.getMatchContext = async (matchId) => {
  const { rows } = await pool.query(`SELECT id FROM "public"."Match" WHERE id = $1`, [matchId]);
  return rows;
};

exports.getAllMatchesWithStatus = async (status) => {
  const params = [];
  let where = '';
  if (status) { params.push(status.toUpperCase()); where = `WHERE m.status = $1`; }
  const { rows } = await pool.query(`${MATCH_SELECT} ${where} ORDER BY m."matchStartTime" ASC`, params);
  return rows;
};

exports.getMatchContests = async (matchId) => {
  const { rows } = await pool.query(`
    SELECT
      c.id, c."entryFee", c."totalSpots", c."joinedSpots", c."prizePool", c.status,
      CASE
        WHEN c."entryFee" = 0              THEN 'Practice Contest'
        WHEN c."totalSpots" >= 500000      THEN 'Mega Contest'
        WHEN c."totalSpots" <= 2           THEN 'Head To Head'
        WHEN c."totalSpots" <= 50          THEN 'Small League'
        ELSE 'Other Contests'
      END AS "contestName"
    FROM "public"."Contest" c
    WHERE c."matchId" = $1
    ORDER BY c."prizePool" DESC
  `, [matchId]);
  return rows;
};
