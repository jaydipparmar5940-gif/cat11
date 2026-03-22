require('dotenv').config();
const srv = require('./src/services/cricapi.service');

srv.getMatchesWithPlayers()
    .then(matches => console.log(`[TEST] Found ${matches.length} matches with players`))
    .catch(err => console.error('[TEST] Error:', err))
    .finally(() => process.exit(0));
