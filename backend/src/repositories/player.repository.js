const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PLAYER_SELECT = `
  SELECT
    p.id,
    p.name,
    p.role,
    t.name                                               AS team,
    COALESCE(t."shortName", UPPER(SUBSTRING(t.name,1,3))) AS team_short,
    COALESCE(t.logo, '')                                 AS team_logo,
    COALESCE(p."imageUrl", '')                           AS image_url
  FROM "Player" p
  JOIN "Team"   t ON t.id = p."teamId"
`;

exports.getPlayers = async (role, team, q) => {
  const conditions = [];
  const params     = [];

  if (role) {
    params.push(role.toUpperCase());
    conditions.push(`p.role = $${params.length}`);
  }
  if (team) {
    params.push(parseInt(team));
    conditions.push(`p."teamId" = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `${PLAYER_SELECT} ${where} ORDER BY p.role ASC, p.name ASC`,
    params
  );
  return rows;
};

exports.getPlayerById = async (playerId) => {
  const { rows } = await pool.query(
    `${PLAYER_SELECT} WHERE p.id = $1`,
    [playerId]
  );
  return rows[0];
};

exports.getMatchTeams = async (matchId) => {
  const { rows } = await pool.query(
    `SELECT "teamAId", "teamBId" FROM "Match" WHERE id = $1`,
    [matchId]
  );
  return rows[0];
};

exports.getMatchSquadPlayers = async (matchId) => {
  const { rows } = await pool.query(
    `${PLAYER_SELECT}
     JOIN "MatchSquad" ms ON ms."playerId" = p.id
     WHERE ms."matchId" = $1
     ORDER BY p.role ASC, p.name ASC`,
    [matchId]
  );
  return rows;
};

exports.getPlayersByTeams = async (teamAId, teamBId) => {
  const { rows } = await pool.query(
    `${PLAYER_SELECT}
     WHERE p."teamId" IN ($1, $2)
     ORDER BY p.role ASC, p.name ASC`,
    [teamAId, teamBId]
  );
  return rows;
};
