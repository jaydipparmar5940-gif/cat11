const contestRepo = require('../repositories/contest.repository');
const socketHandler = require('../sockets/socket.handler');

exports.getContestsByMatch = async (matchId) => {
  return await contestRepo.getContestsByMatch(matchId);
};

exports.joinContest = async (userId, contestId, userTeamId) => {
  const existingEntry = await contestRepo.findContestEntry(contestId, userTeamId);
  if (existingEntry) {
    throw new Error("This team has already joined the contest.");
  }

  const contest = await contestRepo.findContestById(contestId);
  if (!contest) throw new Error("Contest not found");

  const entry = await contestRepo.joinContestTransaction(userId, contestId, userTeamId, contest.entryFee);
  
  // Phase 10: Emit contest_filled event if full
  const updatedContest = await contestRepo.findContestById(contestId);
  if (updatedContest.joinedSpots === updatedContest.totalSpots) {
    if (socketHandler.emitContestFilled) {
      socketHandler.emitContestFilled(contestId, updatedContest);
    }
  }

  return entry;
};
