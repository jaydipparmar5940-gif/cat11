require('dotenv').config();
const axios = require('axios');

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST;
const apiId = '122709';

async function testSquads() {
  const options = {
    method: 'GET',
    url: `https://${RAPID_API_HOST}/msc/v1/squads/${apiId}`,
    headers: {
      'x-rapidapi-key': RAPID_API_KEY,
      'x-rapidapi-host': RAPID_API_HOST
    }
  };

  try {
    const { data } = await axios.request(options);
    console.log('API RESPONSE KEYS:', Object.keys(data));
    console.log('SQUADS LENGTH:', data.squads ? data.squads.length : 0);
    if (data.squads && data.squads.length > 0) {
        console.log('FIRST SQUAD TEAM:', data.squads[0].teamName);
        console.log('FIRST SQUAD PLAYER COUNT:', data.squads[0].player ? data.squads[0].player.length : 0);
        if (data.squads[0].player && data.squads[0].player.length > 0) {
            console.log('FIRST PLAYER:', JSON.stringify(data.squads[0].player[0], null, 2));
        }
    } else {
        console.log('FULL RESPONSE:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testSquads();
