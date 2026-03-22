const playerRepo = require('../repositories/player.repository');

function format(row) {
  return {
    id:        row.id,
    name:      row.name,
    role:      row.role,
    team:      row.team_short || row.team,
    team_name: row.team,
    team_logo: row.team_logo,
    image_url: row.image_url || `https://img.cricapi.com/player/${row.id}.jpg`,
  };
}

exports.getPlayers = async (role, team, q) => {
  const rows = await playerRepo.getPlayers(role, team, q);
  return rows.map(format);
};

exports.getPlayerById = async (playerId) => {
  const row = await playerRepo.getPlayerById(playerId);
  if (!row) return null;
  return format(row);
};

exports.getPlayersByMatch = async (matchId) => {
  const matchTeams = await playerRepo.getMatchTeams(matchId);
  if (!matchTeams) throw new Error("Match not found");

  const { teamAId, teamBId } = matchTeams;
  
  let rows = await playerRepo.getMatchSquadPlayers(matchId);
  if (rows.length === 0) {
    rows = await playerRepo.getPlayersByTeams(teamAId, teamBId);
  }

  const grouped = {};
  for (const row of rows) {
    const formatted = format(row);
    const key = formatted.team;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(formatted);
  }

  // Count raw rows total for the meta response
  const flatPlayers = rows.map(format);
  return { players: flatPlayers, by_team: grouped, count: flatPlayers.length };
};
