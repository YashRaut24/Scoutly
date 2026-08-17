const express = require('express');

const router = express.Router();

router.patch('/:id/bot-messages', (req, res) => {
  res.status(410).json({
    message: 'Scoutly Bot history is stored separately. Use /api/bot/history/save.'
  });
});

module.exports = router;
