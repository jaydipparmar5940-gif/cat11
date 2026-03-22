/**
 * rapidapi.service.js
 * Wraps RapidAPI Cricbuzz endpoints for detailed match data:
 *   - Squad (series level)
 *   - Scorecard / Live Score / Final Score
 *   - Commentary
 *
 * ENV required:
 *   RAPID_API_KEY  – RapidAPI key
 *   RAPID_API_HOST – cricbuzz-cricket.p.rapidapi.com
 */

'use strict';

const axios = require('axios');

const RAPID_API_KEY  = process.env.RAPID_API_KEY  || '';
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';

const headers = () => ({
  'x-rapidapi-key':  RAPID_API_KEY,
  'x-rapidapi-host': RAPID_API_HOST
});

async function get(endpoint) {
  const res = await axios.get(`https://${RAPID_API_HOST}${endpoint}`, { headers: headers() });
  return res.data;
}

// ── Squad (series level) ────────────────────────────────────────────────────
// GET /api/squad?seriesId=<seriesId>
exports.getSquad = async (seriesId) => {
  const data = await get(`/series/v1/${seriesId}/squads`);
  return {
    seriesId,
    seriesName: data.seriesName,
    squads: (data.squads || []).map(s => ({
      teamId:   s.teamId,
      teamName: s.teamName,
      players:  (s.squaddedPlayers || s.players || []).map(p => ({
        id:   p.id,
        name: p.name,
        role: p.role || 'BAT',
        img:  p.faceImageId ? `https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${p.faceImageId}/i.jpg` : null
      }))
    }))
  };
};

// ── Scorecard (live + final) ─────────────────────────────────────────────────
// GET /api/scorecard?matchId=<apiMatchId>
exports.getScorecard = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);
  return {
    matchId,
    status: data.status,
    isMatchComplete: data.ismatchcomplete,
    scorecard: data.scorecard
  };
};

// ── Commentary ───────────────────────────────────────────────────────────────
// GET /api/commentary?matchId=<apiMatchId>
exports.getCommentary = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/comm`);
  return {
    matchId,
    matchHeaders:    data.matchheaders,
    innings:         data.inningsid,
    commentary:      (data.comwrapper || []).map(w => ({
      overNum: w.overNum,
      events:  (w.commentsData || []).map(c => ({
        event:     c.event,
        overText:  c.overText,
        batTeamId: c.batTeamId,
        html:      c.commText
      }))
    }))
  };
};

// ── Live Score (alias for active scorecard) ──────────────────────────────────
// GET /api/livescore?matchId=<apiMatchId>
exports.getLiveScore = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);

  // Pull the most recent innings from the scorecard
  const scorecard = data.scorecard || [];
  const current   = scorecard[scorecard.length - 1] || {};

  return {
    matchId,
    status: data.status,
    isMatchComplete: data.ismatchcomplete,
    currentInnings: {
      battingTeam: current.batTeamDetails?.batTeamName,
      score:       current.scoreDetails?.runs,
      wickets:     current.scoreDetails?.wickets,
      overs:       current.scoreDetails?.overs,
      runRate:     current.scoreDetails?.runRate,
    },
    allInnings: scorecard.map(inn => ({
      batTeam:  inn.batTeamDetails?.batTeamName,
      score:    inn.scoreDetails?.runs,
      wickets:  inn.scoreDetails?.wickets,
      overs:    inn.scoreDetails?.overs
    }))
  };
};

// ── Lineup (derived from scorecard – announced squads) ───────────────────────
// GET /api/lineup?matchId=<apiMatchId>
exports.getLineup = async (matchId) => {
  const data  = await get(`/mcenter/v1/${matchId}/scard`);
  const cards = data.scorecard || [];

  const lineup = cards.map(inn => ({
    teamName: inn.batTeamDetails?.batTeamName,
    batters:  Object.values(inn.batTeamDetails?.batsmenData || {}).map(b => ({
      id:    b.batId,
      name:  b.batName,
      runs:  b.runs,
      balls: b.balls
    })),
    bowlers:  Object.values(inn.bowlTeamDetails?.bowlersData || {}).map(b => ({
      id:      b.bowlId,
      name:    b.bowlName,
      wickets: b.wickets,
      overs:   b.overs,
      runs:    b.runs
    }))
  }));

  return { matchId, lineup };
};

// ── Final Score ──────────────────────────────────────────────────────────────
// GET /api/finalscore?matchId=<apiMatchId>
exports.getFinalScore = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);
  const sc   = data.scorecard || [];

  return {
    matchId,
    result:   data.status,
    complete: data.ismatchcomplete,
    innings:  sc.map(inn => ({
      team:     inn.batTeamDetails?.batTeamName,
      runs:     inn.scoreDetails?.runs,
      wickets:  inn.scoreDetails?.wickets,
      overs:    inn.scoreDetails?.overs,
      runRate:  inn.scoreDetails?.runRate,
    }))
  };
};
