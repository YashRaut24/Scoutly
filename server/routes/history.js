const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ResearchHistory = require('../models/ResearchHistory');
const auth = require('../middleware/auth');

// Protect all history endpoints
router.use(auth);

// GET user-specific research history
router.get('/', async (req, res) => {
  try {
    const history = await ResearchHistory.find({ userId: req.user.id })
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history.' });
  }
});

// POST save research report bound to user
router.post('/', async (req, res) => {
  try {
    const { query, report, depth, citations, isPinned } = req.body;

    const newReport = new ResearchHistory({
      userId: req.user.id,
      query,
      report,
      depth: depth || 'quick',
      citations: citations || {},
      isPinned: isPinned || false
    });

    const saved = await newReport.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save research report.' });
  }
});

// DELETE report owned by user
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ResearchHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Report not found or unauthorized.' });
    }

    res.json({ message: 'Report deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete report.' });
  }
});

// PATCH toggle pin state owned by user
router.patch('/:id/pin', async (req, res) => {
  try {
    const report = await ResearchHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found or unauthorized.' });
    }

    report.isPinned = !report.isPinned;
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update pin state.' });
  }
});

// PATCH toggle public share link owned by user
router.patch('/:id/share', async (req, res) => {
  try {
    const report = await ResearchHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found or unauthorized.' });
    }

    report.isPublic = !report.isPublic;

    // Generate token on first publish if absent
    if (report.isPublic && !report.shareToken) {
      report.shareToken = crypto.randomBytes(8).toString('hex');
    }

    await report.save();
    res.json({
      isPublic: report.isPublic,
      shareToken: report.shareToken,
      shareUrl: report.isPublic ? `${req.protocol}://${req.get('host')}/share/${report.shareToken}` : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update share status.' });
  }
});

module.exports = router;