let ioInstance = null;

module.exports = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Join a contest room for live leaderboard updates
    socket.on('joinContest', (contestId) => {
      socket.join(`contest_${contestId}`);
      console.log(`[SOCKET] User ${socket.id} joined contest: ${contestId}`);
    });

    // Leave a contest room
    socket.on('leaveContest', (contestId) => {
      socket.leave(`contest_${contestId}`);
      console.log(`[SOCKET] User ${socket.id} left contest: ${contestId}`);
    });

    // Join a match room for live score updates
    socket.on('joinMatch', (matchId) => {
      socket.join(`match_${matchId}`);
      console.log(`[SOCKET] User ${socket.id} joined match: ${matchId}`);
    });

    socket.on('leaveMatch', (matchId) => {
      socket.leave(`match_${matchId}`);
      console.log(`[SOCKET] User ${socket.id} left match: ${matchId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit leaderboard updates to all users in a contest room
 */
module.exports.emitLeaderboardUpdate = (contestId, leaderboardData) => {
  if (ioInstance) {
    ioInstance.to(`contest_${contestId}`).emit('leaderboard_update', leaderboardData);
  }
};

/**
 * Emit live match score/stats to all users in a match room
 */
module.exports.emitScoreUpdate = (matchId, scoreData) => {
  if (ioInstance) {
    ioInstance.to(`match_${matchId}`).emit('score_update', scoreData);
  }
};

/**
 * Emit match status changes (UPCOMING -> LIVE -> COMPLETED)
 */
module.exports.emitMatchStatus = (matchId, statusData) => {
  if (ioInstance) {
    // Broadcast to everyone holding a match connection or listening globally
    ioInstance.emit('match_status', statusData);
  }
};

/**
 * Emit contest filled event
 */
module.exports.emitContestFilled = (contestId, contestData) => {
  if (ioInstance) {
    ioInstance.to(`contest_${contestId}`).emit('contest_filled', contestData);
  }
};
