const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this in production
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
app.use('/api/', apiLimiter);

// Socket.io initialization
require('./sockets/socket.handler')(io);

// Match lifecycle cron (UPCOMING → LIVE → COMPLETED)
require('./workers/match-lifecycle.worker');

// Live Score Poller (Runs every 10s)
require('./workers/score.worker').startScoreWorker(io);

// Payout BullMQ Worker
require('./workers/payout.worker');

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/players', require('./routes/player.routes'));
app.use('/api/contests', require('./routes/contest.routes'));
app.use('/api/teams', require('./routes/team.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));

// ── Diagnostic Direct Route ─────────────────────────────────────────────────
const prisma = require('./utils/prisma');
app.get('/api/wallet-direct/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ error: "Not found" });
    res.json({ userId: wallet.userId, balance: parseFloat(wallet.balance) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RapidAPI Cricbuzz direct endpoints ──────────────────────────────────────
// /api/squad, /api/scorecard, /api/commentary, /api/livescore, /api/lineup, /api/finalscore
app.use('/api', require('./routes/rapidapi.routes'));


// ── Status & Health ─────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.status(200).send('API WORKING V4 ✅');
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`[CAT11 BACKEND] Server running on port ${PORT}`);
});

module.exports = { app, io };
