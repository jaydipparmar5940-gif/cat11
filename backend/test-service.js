require('dotenv').config();
const srv = require('./src/services/match.service');

srv.getUpcomingMatches()
    .then(data => console.log(`[TEST] matchService returned count: ${data.count}`))
    .catch(err => console.error('[TEST] Error:', err))
    .finally(() => process.exit(0));
