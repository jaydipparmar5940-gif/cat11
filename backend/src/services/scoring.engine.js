/**
 * Scoring Rules:
 * Run = 1
 * Four = 1
 * Six = 2
 * Wicket = 25
 * Catch = 8
 * Stumping = 12
 * Runout = 12
 * Captain = 2x
 * Vice Captain = 1.5x
 */

exports.calculatePoints = (stats) => {
  let points = 0;
  
  points += (stats.runs || 0) * 1;
  points += (stats.fours || 0) * 1;
  points += (stats.sixes || 0) * 2;
  points += (stats.wickets || 0) * 25;
  points += (stats.maidens || 0) * 12;
  points += (stats.catches || 0) * 8;
  points += (stats.runouts || 0) * 6;
  points += (stats.stumpings || 0) * 12;

  return points;
};

exports.calculateTeamPoints = (teamPlayers, playerPointsMap, captainId, viceCaptainId) => {
  let totalPoints = 0;
  
  teamPlayers.forEach(tp => {
    let p = playerPointsMap[tp.playerId] || 0;
    
    if (tp.playerId === captainId) {
      totalPoints += p * 2;
    } else if (tp.playerId === viceCaptainId) {
      totalPoints += p * 1.5;
    } else {
      totalPoints += p;
    }
  });
  
  return totalPoints;
};
