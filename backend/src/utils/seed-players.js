/**
 * seed-players.js
 * Seeds full IPL 2024 player rosters (all 10 teams, ~15 players each)
 * into the PostgreSQL database.
 * Run: node src/utils/seed-players.js
 */

const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '5940',
  database: 'fantasy_cricket_db'
});

// avatarColor and shortName are used for the jersey-style avatar in the frontend
// role: WK | BAT | AR | BOWL
// selPct: selection percentage to show in UI

const ALL_PLAYERS = [
  // ──────────────────────────────────────────────────────────────────
  // teamId 1 — Mumbai Indians (MI)  primary: #004BA0  accent: #D1AB3E
  // ──────────────────────────────────────────────────────────────────
  { name: 'Rohit Sharma',       teamId: 1, role: 'BAT',  credit: 10.5, selPct: 94.2 },
  { name: 'Suryakumar Yadav',  teamId: 1, role: 'BAT',  credit: 10.0, selPct: 89.1 },
  { name: 'Tilak Varma',       teamId: 1, role: 'BAT',  credit:  8.5, selPct: 67.4 },
  { name: 'Naman Dhir',        teamId: 1, role: 'BAT',  credit:  7.5, selPct: 42.0 },
  { name: 'Ishan Kishan',      teamId: 1, role: 'WK',   credit:  9.5, selPct: 78.3 },
  { name: 'Dewald Brevis',     teamId: 1, role: 'WK',   credit:  8.0, selPct: 55.5 },
  { name: 'Hardik Pandya',     teamId: 1, role: 'AR',   credit: 11.0, selPct: 95.6 },
  { name: 'Romario Shepherd',  teamId: 1, role: 'AR',   credit:  7.5, selPct: 39.2 },
  { name: 'Jasprit Bumrah',    teamId: 1, role: 'BOWL', credit: 10.5, selPct: 97.1 },
  { name: 'Nuwan Thushara',    teamId: 1, role: 'BOWL', credit:  7.5, selPct: 44.8 },
  { name: 'Piyush Chawla',     teamId: 1, role: 'BOWL', credit:  7.0, selPct: 31.0 },
  { name: 'Gerald Coetzee',    teamId: 1, role: 'BOWL', credit:  8.0, selPct: 52.4 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 2 — Delhi Capitals (DC)  primary: #0044cc  accent: #FF002C
  // ──────────────────────────────────────────────────────────────────
  { name: 'Rishabh Pant',      teamId: 2, role: 'WK',   credit: 10.5, selPct: 88.7 },
  { name: 'David Warner',      teamId: 2, role: 'BAT',  credit: 10.0, selPct: 82.1 },
  { name: 'Jake Fraser-McGurk',teamId: 2, role: 'BAT',  credit:  8.5, selPct: 65.9 },
  { name: 'Shai Hope',         teamId: 2, role: 'WK',   credit:  8.0, selPct: 44.2 },
  { name: 'Axar Patel',        teamId: 2, role: 'AR',   credit:  9.5, selPct: 85.4 },
  { name: 'Mitchell Marsh',    teamId: 2, role: 'AR',   credit:  9.5, selPct: 79.3 },
  { name: 'Tristan Stubbs',    teamId: 2, role: 'BAT',  credit:  8.0, selPct: 55.3 },
  { name: 'Kuldeep Yadav',     teamId: 2, role: 'BOWL', credit:  9.0, selPct: 80.1 },
  { name: 'Mukesh Kumar',      teamId: 2, role: 'BOWL', credit:  7.5, selPct: 43.7 },
  { name: 'Ishant Sharma',     teamId: 2, role: 'BOWL', credit:  7.5, selPct: 38.5 },
  { name: 'Khaleel Ahmed',     teamId: 2, role: 'BOWL', credit:  7.0, selPct: 29.5 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 3 — Rajasthan Royals (RR)  primary: #FF508F  accent: #254AA5
  // ──────────────────────────────────────────────────────────────────
  { name: 'Sanju Samson',      teamId: 3, role: 'WK',   credit:  9.5, selPct: 86.5 },
  { name: 'Jos Buttler',       teamId: 3, role: 'WK',   credit: 10.0, selPct: 89.3 },
  { name: 'Yashasvi Jaiswal',  teamId: 3, role: 'BAT',  credit:  9.5, selPct: 90.2 },
  { name: 'Riyan Parag',       teamId: 3, role: 'BAT',  credit:  8.0, selPct: 58.4 },
  { name: 'Shimron Hetmyer',   teamId: 3, role: 'BAT',  credit:  8.5, selPct: 64.7 },
  { name: 'Rovman Powell',     teamId: 3, role: 'BAT',  credit:  8.0, selPct: 51.2 },
  { name: 'Ravindra Jadeja',   teamId: 3, role: 'AR',   credit:  9.0, selPct: 76.3 },
  { name: 'Yuzvendra Chahal',  teamId: 3, role: 'BOWL', credit:  9.0, selPct: 82.4 },
  { name: 'Trent Boult',       teamId: 3, role: 'BOWL', credit:  9.0, selPct: 78.9 },
  { name: 'Sandeep Sharma',    teamId: 3, role: 'BOWL', credit:  7.0, selPct: 35.6 },
  { name: 'Wanindu Hasaranga', teamId: 3, role: 'AR',   credit:  8.5, selPct: 68.1 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 4 — Sunrisers Hyderabad (SRH)  primary: #FF7B00  accent: #1B1C1E
  // ──────────────────────────────────────────────────────────────────
  { name: 'Heinrich Klaasen',  teamId: 4, role: 'WK',   credit: 10.0, selPct: 85.6 },
  { name: 'Travis Head',       teamId: 4, role: 'BAT',  credit: 10.5, selPct: 91.2 },
  { name: 'Abhishek Sharma',   teamId: 4, role: 'BAT',  credit:  8.5, selPct: 72.4 },
  { name: 'Aiden Markram',     teamId: 4, role: 'BAT',  credit:  8.5, selPct: 67.1 },
  { name: 'Nitish Reddy',      teamId: 4, role: 'AR',   credit:  8.0, selPct: 59.3 },
  { name: 'Pat Cummins',       teamId: 4, role: 'AR',   credit: 10.5, selPct: 88.4 },
  { name: 'Shahbaz Ahmed',     teamId: 4, role: 'AR',   credit:  7.5, selPct: 44.2 },
  { name: 'Bhuvneshwar Kumar', teamId: 4, role: 'BOWL', credit:  8.5, selPct: 73.6 },
  { name: 'T Natarajan',       teamId: 4, role: 'BOWL', credit:  8.0, selPct: 62.8 },
  { name: 'Mayank Markande',   teamId: 4, role: 'BOWL', credit:  7.0, selPct: 32.1 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 5 — Chennai Super Kings (CSK)  primary: #FFCC00  accent: #002FA7
  // ──────────────────────────────────────────────────────────────────
  { name: 'MS Dhoni',          teamId: 5, role: 'WK',   credit:  9.5, selPct: 94.8 },
  { name: 'Ruturaj Gaikwad',   teamId: 5, role: 'BAT',  credit:  9.0, selPct: 88.3 },
  { name: 'Devon Conway',      teamId: 5, role: 'BAT',  credit:  8.5, selPct: 68.7 },
  { name: 'Shivam Dube',       teamId: 5, role: 'BAT',  credit:  8.5, selPct: 74.2 },
  { name: 'Daryl Mitchell',    teamId: 5, role: 'BAT',  credit:  8.0, selPct: 55.3 },
  { name: 'Ravindra Jadeja',   teamId: 5, role: 'AR',   credit:  9.5, selPct: 95.1 },
  { name: 'Moeen Ali',         teamId: 5, role: 'AR',   credit:  8.5, selPct: 67.9 },
  { name: 'Sam Curran',        teamId: 5, role: 'AR',   credit:  8.0, selPct: 58.4 },
  { name: 'Matheesha Pathirana',teamId: 5, role: 'BOWL', credit:  8.5, selPct: 84.3 },
  { name: 'Deepak Chahar',     teamId: 5, role: 'BOWL', credit:  8.0, selPct: 65.8 },
  { name: 'Tushar Deshpande',  teamId: 5, role: 'BOWL', credit:  7.5, selPct: 48.2 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 6 — Kolkata Knight Riders (KKR)  primary: #3A225D  accent: #F2C210
  // ──────────────────────────────────────────────────────────────────
  { name: 'Phil Salt',         teamId: 6, role: 'WK',   credit:  9.5, selPct: 86.4 },
  { name: 'Sunil Narine',      teamId: 6, role: 'AR',   credit:  9.5, selPct: 91.7 },
  { name: 'Andre Russell',     teamId: 6, role: 'AR',   credit: 10.0, selPct: 93.2 },
  { name: 'Venkatesh Iyer',    teamId: 6, role: 'AR',   credit:  8.5, selPct: 72.6 },
  { name: 'Rinku Singh',       teamId: 6, role: 'BAT',  credit:  8.5, selPct: 76.3 },
  { name: 'Shreyas Iyer',      teamId: 6, role: 'BAT',  credit:  9.0, selPct: 82.5 },
  { name: 'Rahmanullah Gurbaz',teamId: 6, role: 'WK',   credit:  8.5, selPct: 65.4 },
  { name: 'Varun Chakravarthy',teamId: 6, role: 'BOWL', credit:  8.5, selPct: 79.1 },
  { name: 'Mitchell Starc',    teamId: 6, role: 'BOWL', credit:  9.5, selPct: 87.6 },
  { name: 'Harshit Rana',      teamId: 6, role: 'BOWL', credit:  7.5, selPct: 53.8 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 7 — Royal Challengers Bangalore (RCB)  primary: #C80000  accent: #FFD700
  // ──────────────────────────────────────────────────────────────────
  { name: 'Virat Kohli',       teamId: 7, role: 'BAT',  credit: 11.0, selPct: 98.8 },
  { name: 'Faf du Plessis',    teamId: 7, role: 'BAT',  credit:  9.5, selPct: 84.2 },
  { name: 'Rajat Patidar',     teamId: 7, role: 'BAT',  credit:  8.5, selPct: 68.4 },
  { name: 'Dinesh Karthik',    teamId: 7, role: 'WK',   credit:  8.5, selPct: 76.3 },
  { name: 'Glenn Maxwell',     teamId: 7, role: 'AR',   credit:  9.5, selPct: 89.1 },
  { name: 'Cameron Green',     teamId: 7, role: 'AR',   credit:  8.5, selPct: 63.7 },
  { name: 'Suyash Prabhudesai',teamId: 7, role: 'BAT',  credit:  7.0, selPct: 35.4 },
  { name: 'Mohammed Siraj',    teamId: 7, role: 'BOWL', credit:  9.0, selPct: 87.5 },
  { name: 'Yash Dayal',        teamId: 7, role: 'BOWL', credit:  7.5, selPct: 52.3 },
  { name: 'Akash Deep',        teamId: 7, role: 'BOWL', credit:  7.5, selPct: 48.7 },
  { name: 'Alzarri Joseph',    teamId: 7, role: 'BOWL', credit:  8.0, selPct: 56.9 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 8 — Lucknow Super Giants (LSG)  primary: #A6DBFF  accent: #FFCE00
  // ──────────────────────────────────────────────────────────────────
  { name: 'KL Rahul',          teamId: 8, role: 'WK',   credit: 10.0, selPct: 87.4 },
  { name: 'Quinton de Kock',   teamId: 8, role: 'WK',   credit:  9.5, selPct: 82.3 },
  { name: 'Deepak Hooda',      teamId: 8, role: 'BAT',  credit:  8.0, selPct: 55.6 },
  { name: 'Marcus Stoinis',    teamId: 8, role: 'AR',   credit:  9.0, selPct: 78.2 },
  { name: 'Krunal Pandya',     teamId: 8, role: 'AR',   credit:  8.5, selPct: 67.1 },
  { name: 'Nicholas Pooran',   teamId: 8, role: 'BAT',  credit:  9.0, selPct: 79.4 },
  { name: 'Kyle Mayers',       teamId: 8, role: 'AR',   credit:  8.0, selPct: 58.3 },
  { name: 'Ravi Bishnoi',      teamId: 8, role: 'BOWL', credit:  8.5, selPct: 73.9 },
  { name: 'Mark Wood',         teamId: 8, role: 'BOWL', credit:  9.0, selPct: 80.7 },
  { name: 'Mohsin Khan',       teamId: 8, role: 'BOWL', credit:  7.5, selPct: 44.3 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 9 — Gujarat Titans (GT)  primary: #1C2B5F  accent: #B7B9BD
  // ──────────────────────────────────────────────────────────────────
  { name: 'Shubman Gill',      teamId: 9, role: 'BAT',  credit: 10.0, selPct: 92.7 },
  { name: 'Wriddhiman Saha',   teamId: 9, role: 'WK',   credit:  8.0, selPct: 52.6 },
  { name: 'David Miller',      teamId: 9, role: 'BAT',  credit:  9.0, selPct: 81.4 },
  { name: 'Vijay Shankar',     teamId: 9, role: 'AR',   credit:  7.5, selPct: 45.2 },
  { name: 'Rashid Khan',       teamId: 9, role: 'AR',   credit: 10.5, selPct: 95.3 },
  { name: 'B Sai Sudharsan',   teamId: 9, role: 'BAT',  credit:  8.5, selPct: 68.2 },
  { name: 'Rahul Tewatia',     teamId: 9, role: 'AR',   credit:  7.5, selPct: 48.7 },
  { name: 'Mohammed Shami',    teamId: 9, role: 'BOWL', credit:  9.5, selPct: 89.1 },
  { name: 'Spencer Johnson',   teamId: 9, role: 'BOWL', credit:  8.0, selPct: 60.3 },
  { name: 'Mohit Sharma',      teamId: 9, role: 'BOWL', credit:  7.5, selPct: 47.4 },

  // ──────────────────────────────────────────────────────────────────
  // teamId 10 — Punjab Kings (PBKS)  primary: #ED2039  accent: #A7A9AC
  // ──────────────────────────────────────────────────────────────────
  { name: 'Jonny Bairstow',    teamId: 10, role: 'WK',   credit:  9.5, selPct: 84.1 },
  { name: 'Prabhsimran Singh', teamId: 10, role: 'WK',   credit:  8.0, selPct: 58.3 },
  { name: 'Shikhar Dhawan',    teamId: 10, role: 'BAT',  credit:  8.5, selPct: 69.7 },
  { name: 'Rilee Rossouw',     teamId: 10, role: 'BAT',  credit:  8.5, selPct: 65.4 },
  { name: 'Liam Livingstone',  teamId: 10, role: 'AR',   credit:  9.0, selPct: 78.6 },
  { name: 'Sam Curran',        teamId: 10, role: 'AR',   credit:  8.5, selPct: 70.2 },
  { name: 'Arshdeep Singh',    teamId: 10, role: 'BOWL', credit:  9.0, selPct: 83.7 },
  { name: 'Kagiso Rabada',     teamId: 10, role: 'BOWL', credit:  9.5, selPct: 86.3 },
  { name: 'Rishi Dhawan',      teamId: 10, role: 'BOWL', credit:  7.0, selPct: 38.9 },
  { name: 'Harshal Patel',     teamId: 10, role: 'BOWL', credit:  8.0, selPct: 62.4 },
];

// Also add a `selectionPercentage` column if it doesn't exist
const migrationSQL = `
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "selectionPercentage" DECIMAL(5,1) DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "isPlaying" BOOLEAN DEFAULT TRUE;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "teamColor" VARCHAR(20) DEFAULT '#333';
`;

async function seed() {
  try {
    await client.connect();
    console.log('[SEED] Connected to database');

    // Run migrations to add new columns
    await client.query(migrationSQL);
    console.log('[SEED] Player table columns updated');

    // Delete existing players (we'll re-insert)
    await client.query('DELETE FROM "Player"');
    console.log('[SEED] Cleared existing players');

    // Insert all players
    for (const p of ALL_PLAYERS) {
      await client.query(
        `INSERT INTO "Player" (name, "teamId", role, credit, "selectionPercentage", "isPlaying")
         VALUES ($1, $2, $3, $4, $5, true)`,
        [p.name, p.teamId, p.role, p.credit, p.selPct]
      );
    }

    console.log(`[SEED] ✅ Inserted ${ALL_PLAYERS.length} players across all 10 IPL teams`);
    await client.end();
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
}

seed();
