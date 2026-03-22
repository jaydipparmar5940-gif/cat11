const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('http://localhost:5000/api/matches');
    console.log('Total matches:', res.data.length);
    if (res.data.length > 0) {
      console.log('First match sample:', JSON.stringify(res.data[0], null, 2));
    }
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

testApi();
