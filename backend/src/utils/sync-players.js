/**
 * sync-players.js
 * Fetches squad data from RapidAPI Cricbuzz for upcoming matches
 * and upserts players into the local PostgreSQL DB.
 *
 * Usage: node src/utils/sync-players.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const RAPID_API_KEY  = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';

const headers = {
  'x-rapidapi-key':  RAPID_API_KEY,
  'x-rapidapi-host': RAPID_API_HOST
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normaliseRole(r = '') {
  r = r.toLowerCase();
  if (r.includes('wicket') || r.includes('wk') || r.includes('keeper')) return 'WK';
  if (r.includes('all'))  return 'AR';
  if (r.includes('bowl')) return 'BOWL';
  return 'BAT';
}

async function syncTeamPlayers(teamId, squadPlayers) {
  const HEADER_KEYWORDS = ['BATTERS', 'BOWLERS', 'ALL ROUNDERS', 'WICKET KEEPERS', 'ALLROUNDERS'];
  const isHeader = (name) => HEADER_KEYWORDS.some(k => name.toUpperCase().includes(k));

  for (const p of squadPlayers) {
    const name = (p.name || p.fullName || p.playerName || '').trim();
    if (!name || isHeader(name)) continue; // skip section headers

    const role = normaliseRole(p.role || '');

    const existing = await prisma.player.findFirst({ where: { name, teamId } });
    if (!existing) {
      await prisma.player.create({
        data: { name, teamId, role, imageUrl: null }
      });
      console.log(`  [ADD] ${name} (${role})`);
    }
  }
}

async function main() {
  const matches = await prisma.match.findMany({
    where: { status: 'UPCOMING' },
    include: { teamA: true, teamB: true }
  });

  console.log(`\nFound ${matches.length} upcoming matches.\n`);

  for (const m of matches) {
    console.log(`\n[MATCH] ${m.teamA.name} vs ${m.teamB.name}`);

    // Look up series squads for this match via looking up each team's series
    // We'll use the /series/v1/{seriesId}/squads but we need a seriesId
    // For now we try to find squad info via upcoming match API
    try {
      const { data } = await axios.get(
        `https://${RAPID_API_HOST}/matches/v1/upcoming`,
        { headers }
      );

      const typeMatches = data.typeMatches || [];
      let seriesId = null;

      outer: for (const type of typeMatches) {
        for (const sMatch of type.seriesMatches || []) {
          const wrapper = sMatch.seriesAdWrapper;
          if (!wrapper) continue;
          for (const matchObj of wrapper.matches || []) {
            const info = matchObj.matchInfo;
            if (!info) continue;
            const t1 = info.team1.teamName;
            const t2 = info.team2.teamName;
            if (
              (t1 === m.teamA.name && t2 === m.teamB.name) ||
              (t2 === m.teamA.name && t1 === m.teamB.name)
            ) {
              seriesId = wrapper.seriesId;
              break outer;
            }
          }
        }
      }

      if (!seriesId) {
        console.log('  [SKIP] Could not find seriesId for this match.');
        continue;
      }

      console.log(`  [SERIES] seriesId=${seriesId}`);
      await sleep(500);

      const { data: squadsData } = await axios.get(
        `https://${RAPID_API_HOST}/series/v1/${seriesId}/squads`,
        { headers }
      );

      for (const squad of squadsData.squads || []) {
        const teamName = squad.teamName || '';
        // Match to the correct DB team ID by comparing name
        let dbTeamId = null;
        if (m.teamA.name === teamName) dbTeamId = m.teamAId;
        else if (m.teamB.name === teamName) dbTeamId = m.teamBId;
        else {
          // Fuzzy match: check if either team name contains the squad team name
          if (m.teamA.name.toLowerCase().includes(teamName.toLowerCase()) ||
              teamName.toLowerCase().includes(m.teamA.name.toLowerCase())) {
            dbTeamId = m.teamAId;
          } else if (m.teamB.name.toLowerCase().includes(teamName.toLowerCase()) ||
              teamName.toLowerCase().includes(m.teamB.name.toLowerCase())) {
            dbTeamId = m.teamBId;
          } else {
            // fallback: alternate between A and B
            dbTeamId = null;
          }
        }

        if (!dbTeamId) { console.log(`  [WARN] Could not match team "${teamName}" → skipping`); continue; }

        // Fetch the squad detail (players list is inside each squad entry)
        try {
          const sId = squad.squadsId || squad.squadId;
          if (!sId) { console.log(`  [WARN] No squadId for ${teamName}`); continue; }
          await sleep(300);
          const { data: squadDetail } = await axios.get(
            `https://${RAPID_API_HOST}/series/v1/${seriesId}/squads/${sId}`,
            { headers }
          );
          const players = squadDetail.player || squadDetail.players || [];
          console.log(`  [TEAM] ${teamName} (dbId=${dbTeamId}) → ${players.length} players`);
          await syncTeamPlayers(dbTeamId, players);
        } catch (e) {
          console.log(`  [ERR] Squad detail for ${teamName}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`  [ERR] ${e.response?.status || e.message}`);
    }
  }

  await prisma.$disconnect();
  console.log('\n[DONE]');
}

main().catch(e => { console.error(e); process.exit(1); });
