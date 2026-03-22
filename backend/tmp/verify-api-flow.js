const axios = require('axios');

async function verify() {
  try {
    // 1. Get all matches
    const matchesRes = await axios.get('http://localhost:5000/api/matches');
    const matches = matchesRes.data;
    console.log(`Found ${matches.length} matches.`);
    
    if (matches.length > 0) {
      const firstMatch = matches[0];
      console.log(`Testing match ${firstMatch.id}: ${firstMatch.teamA.shortName} vs ${firstMatch.teamB.shortName}`);
      
      // 2. Get match detail
      const detailRes = await axios.get(`http://localhost:5000/api/matches/${firstMatch.id}`);
      console.log('Match detail OK:', detailRes.data.id === firstMatch.id);
      
      // 3. Get players
      const playersRes = await axios.get(`http://localhost:5000/api/matches/${firstMatch.id}/players`);
      console.log(`Found ${playersRes.data.length} players for this match.`);
      
      // 4. Get contests
      const contestsRes = await axios.get(`http://localhost:5000/api/matches/${firstMatch.id}/contests`);
      console.log(`Found ${contestsRes.data.length} contests for this match.`);
    }
  } catch (err) {
    console.error('VERIFICATION FAILED:', err.response?.data || err.message);
  }
}

verify();
