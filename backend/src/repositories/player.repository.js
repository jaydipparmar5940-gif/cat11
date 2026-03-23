const prisma = require('../utils/prisma');

const mapPlayer = (p) => ({
  id: p.id,
  name: p.name,
  role: p.role,
  team: p.team,
  team_short: p.team_short || p.team?.substring(0, 3).toUpperCase(),
  team_logo: p.team_logo || '',
  image_url: p.image || ''
});

exports.getPlayers = async (role, team, q) => {
  let whereClause = '1=1';
  if (role) whereClause += ` AND p.role = '${role.toUpperCase()}'`;
  if (team) whereClause += ` AND p."teamId" = ${parseInt(team)}`;
  if (q) whereClause += ` AND p.name ILIKE '%${q.replace(/'/g, "''")}%'`;

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(t.logo, 'https://via.placeholder.com/40') AS team_logo,
      COALESCE(p."imageUrl", '') AS image
    FROM "Player" p
    JOIN "Team" t ON p."teamId" = t.id
    WHERE ${whereClause}
    ORDER BY p.role ASC, p.name ASC
  `);
  return rows.map(mapPlayer);
};

exports.getPlayerById = async (playerId) => {
  const id = parseInt(playerId);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(t.logo, 'https://via.placeholder.com/40') AS team_logo,
      COALESCE(p."imageUrl", '') AS image
    FROM "Player" p
    JOIN "Team" t ON p."teamId" = t.id
    WHERE p.id = ${id}
  `);
  if (!rows || rows.length === 0) return null;
  return mapPlayer(rows[0]);
};

exports.getMatchTeams = async (matchId) => {
  const id = parseInt(matchId);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "teamAId", "teamBId"
    FROM "Match"
    WHERE id = ${id}
  `);
  return rows && rows.length > 0 ? rows[0] : null;
};

exports.getMatchSquadPlayers = async (matchId) => {
  const id = parseInt(matchId);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(t.logo, 'https://via.placeholder.com/40') AS team_logo,
      COALESCE(p."imageUrl", '') AS image
    FROM "MatchSquad" s
    JOIN "Player" p ON s."playerId" = p.id
    JOIN "Team" t ON p."teamId" = t.id
    WHERE s."matchId" = ${id}
    ORDER BY p.role ASC, p.name ASC
  `);
  return rows.map(mapPlayer);
};

exports.getPlayersByTeams = async (teamAId, teamBId) => {
  const tA = parseInt(teamAId);
  const tB = parseInt(teamBId);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      p.id, p.name, p.role,
      t.name AS team,
      COALESCE(t."shortName", UPPER(SUBSTRING(t.name, 1, 3))) AS team_short,
      COALESCE(t.logo, 'https://via.placeholder.com/40') AS team_logo,
      COALESCE(p."imageUrl", '') AS image
    FROM "Player" p
    JOIN "Team" t ON p."teamId" = t.id
    WHERE p."teamId" IN (${tA}, ${tB})
    ORDER BY p.role ASC, p.name ASC
  `);
  return rows.map(mapPlayer);
};
