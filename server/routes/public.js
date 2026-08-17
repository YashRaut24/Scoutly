const express = require('express');
const router = express.Router();
const ResearchHistory = require('../models/ResearchHistory');

router.get('/report/:shareToken', async (req, res) => {
  try {
    const report = await ResearchHistory.findOne({
      shareToken: req.params.shareToken,
      isPublic: true
    }).select('query report depth citations createdAt');

    if (!report) {
      return res.status(404).json({ message: 'Public research report not found or link deactivated.' });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving public report.' });
  }
});

module.exports = router;