const prisma = require('../utils/prisma');

const mapMatch = (m) => ({
  match_id: m.id,
  team_a: m.teamA?.name,
  team_b: m.teamB?.name,
  match_time: m.matchStartTime,
  status: m.status,
  venue: m.venue || '',
  api_id: m.apiId || null,
  team_a_info: {
    id: m.teamA?.id,
    shortName: m.teamA?.shortName || m.teamA?.name?.substring(0, 3).toUpperCase(),
    logo: m.teamA?.logo || 'https://via.placeholder.com/40'
  },
  team_b_info: {
    id: m.teamB?.id,
    shortName: m.teamB?.shortName || m.teamB?.name?.substring(0, 3).toUpperCase(),
    logo: m.teamB?.logo || 'https://via.placeholder.com/40'
  }
});

const mapPlayer = (p, teamName, teamShort) => ({
  id: p.id,
  name: p.name,
  role: p.role,
  team: teamShort || teamName,
  image: p.imageUrl || ''
});

exports.getUpcomingMatches = async () => {
  const matches = await prisma.match.findMany({
    where: { status: 'UPCOMING' },
    orderBy: { matchStartTime: 'asc' },
    include: { teamA: true, teamB: true }
  });
  return matches.map(mapMatch);
};

exports.getMatchDetails = async (matchId) => {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId) },
    include: { teamA: true, teamB: true }
  });
  return match ? [mapMatch(match)] : [];
};

exports.getMatchPlayersByMatchId = async (matchId) => {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId) },
    include: { teamA: { include: { players: true } }, teamB: { include: { players: true } } }
  });
  if (!match) return [];
  
  const players = [];
  match.teamA.players.forEach(p => players.push(mapPlayer(p, match.teamA.name, match.teamA.shortName)));
  match.teamB.players.forEach(p => players.push(mapPlayer(p, match.teamB.name, match.teamB.shortName)));
  
  players.sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.name.localeCompare(b.name);
  });
  return players;
};

exports.getMatchSquad = async (matchId) => {
  // If Squad table is empty, we fallback to all team players
  const squads = await prisma.matchSquad.findMany({
    where: { matchId: parseInt(matchId) },
    include: { player: { include: { team: true } } }
  });
  if (!squads || squads.length === 0) {
    return this.getMatchPlayersByMatchId(matchId);
  }
  
  const players = squads.map(s => mapPlayer(s.player, s.player.team.name, s.player.team.shortName));
  players.sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.name.localeCompare(b.name);
  });
  return players;
};

exports.getMatchContext = async (matchId) => {
  const match = await prisma.match.findUnique({
    where: { id: parseInt(matchId) },
    select: { id: true }
  });
  return match ? [{ id: match.id }] : [];
};

exports.getAllMatchesWithStatus = async (status) => {
  const where = status ? { status: status.toUpperCase() } : {};
  const matches = await prisma.match.findMany({
    where,
    orderBy: { matchStartTime: 'asc' },
    include: { teamA: true, teamB: true }
  });
  return matches.map(mapMatch);
};

exports.getMatchContests = async (matchId) => {
  const contests = await prisma.contest.findMany({
    where: { matchId: parseInt(matchId) },
    orderBy: { prizePool: 'desc' }
  });
  return contests.map(c => {
    let contestName = 'Other Contests';
    if (parseFloat(c.entryFee) === 0) contestName = 'Practice Contest';
    else if (c.totalSpots >= 500000) contestName = 'Mega Contest';
    else if (c.totalSpots <= 2) contestName = 'Head To Head';
    else if (c.totalSpots <= 50) contestName = 'Small League';

    return {
      id: c.id,
      entryFee: parseFloat(c.entryFee),
      totalSpots: c.totalSpots,
      joinedSpots: c.joinedSpots,
      prizePool: parseFloat(c.prizePool),
      status: c.status,
      contestName
    };
  });
};
