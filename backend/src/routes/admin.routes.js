const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Optionally, you can add an admin auth middleware here 
// e.g., router.use(verifyAdminToken);

// --- Matches ---
router.post('/matches', adminController.addMatch);
router.put('/matches/:id/start', adminController.startMatch);
router.put('/matches/:id/end', adminController.endMatch);

// --- Players ---
router.put('/players/:id', adminController.editPlayer);

// --- Contests ---
router.post('/contests', adminController.createContest);
router.post('/contests/:id/recalculate', adminController.recalculateLeaderboard);

// --- MIGRATION & SEEDING ---
router.post('/migrate-seed', adminController.migrateSeed);

module.exports = router;
