const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const { executeResearchTask } = require('../services/cronRunner');

router.use(auth);

// GET all schedules for logged-in user
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch schedules.' });
  }
});

// POST create a new recurring schedule
router.post('/', async (req, res) => {
  try {
    const { query, cronExpression, email, depth } = req.body;

    if (!query || !email) {
      return res.status(400).json({ message: 'Query and Email are required.' });
    }

    const schedule = new Schedule({
      userId: req.user.id,
      query,
      cronExpression: cronExpression || '0 9 * * 1',
      email,
      depth: depth || 'quick'
    });

    const saved = await schedule.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create schedule.' });
  }
});

// PATCH toggle schedule active state
router.patch('/:id/toggle', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user.id });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    schedule.isActive = !schedule.isActive;
    await schedule.save();
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle schedule.' });
  }
});

// POST trigger immediate manual test run
router.post('/:id/run-now', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user.id });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    // Run task asynchronously
    executeResearchTask(schedule);

    res.json({ message: 'Digest generation triggered manually.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to trigger run.' });
  }
});

// DELETE schedule
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Schedule.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!deleted) {
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    res.json({ message: 'Schedule deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete schedule.' });
  }
});

module.exports = router;