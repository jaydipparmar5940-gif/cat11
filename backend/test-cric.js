require('dotenv').config();
const srv = require('./src/services/cricapi.service');

srv.getUpcomingMatches()
    .then(matches => console.log(`[TEST] Fetched ${matches.length} matches`))
    .catch(err => console.error('[TEST] Fatal:', err))
    .finally(() => process.exit(0));
