const express = require('express');
const router = express.Router();
const ReputationService = require('../services/reputationService');

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reputation = await ReputationService.getUserReputation(userId);
    res.json(reputation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const history = await ReputationService.getReputationHistory(userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 