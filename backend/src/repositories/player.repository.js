const prisma = require('../utils/prisma');

const mapPlayer = (p) => ({
  id: p.id,
  name: p.name,
  role: p.role,
  team: p.team?.name,
  team_short: p.team?.shortName || p.team?.name?.substring(0, 3).toUpperCase(),
  team_logo: p.team?.logo || '',
  image_url: p.imageUrl || ''
});

exports.getPlayers = async (role, team, q) => {
  const where = {};
  if (role) where.role = role.toUpperCase();
  if (team) where.teamId = parseInt(team);
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: { team: true }
  });
  return players.map(mapPlayer);
};

exports.getPlayerById = async (playerId) => {
  const p = await prisma.player.findUnique({
    where: { id: parseInt(playerId) },
    include: { team: true }
  });
  if (!p) return null;
  return mapPlayer(p);
};

exports.getMatchTeams = async (matchId) => {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId) },
    select: { teamAId: true, teamBId: true }
  });
  return match;
};

exports.getMatchSquadPlayers = async (matchId) => {
  const squads = await prisma.matchSquad.findMany({
    where: { matchId: parseInt(matchId) },
    include: { player: { include: { team: true } } }
  });
  
  const mapped = squads.map(s => mapPlayer(s.player));
  mapped.sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.name.localeCompare(b.name);
  });
  return mapped;
};

exports.getPlayersByTeams = async (teamAId, teamBId) => {
  const players = await prisma.player.findMany({
    where: { teamId: { in: [teamAId, teamBId] } },
    include: { team: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });
  return players.map(mapPlayer);
};
