const express = require('express');
const mongoose = require('mongoose');
const BotHistory = require('../models/botHistory');
const ResearchHistory = require('../models/ResearchHistory');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeMessage = (message, fallbackSender) => {
  if (!message || typeof message.text !== 'string' || !message.text.trim()) {
    return null;
  }

  return {
    sender: ['user', 'bot'].includes(message.sender) ? message.sender : fallbackSender,
    text: message.text.trim(),
    citationMap: message.citationMap || {},
    isError: Boolean(message.isError)
  };
};

const buildTitle = (title, userMessage) => {
  const text = title || userMessage?.text || 'Scoutly Bot Chat';
  const trimmed = text.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
};

const toSummary = (session) => {
  const messages = session.messages || [];
  const lastMessage = messages[messages.length - 1];

  return {
    _id: session._id,
    reportId: session.reportId,
    title: session.title,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
    messageCount: messages.length,
    lastMessage: lastMessage?.text || ''
  };
};

const getOwnedReport = async (reportId, userId) => {
  if (!reportId || !isValidId(reportId)) {
    return null;
  }

  return ResearchHistory.findOne({ _id: reportId, userId }).select('_id');
};

// GET /api/bot/history?reportId=:id
// Fetch bot chat sessions for the current user and research page.
router.get('/history', async (req, res) => {
  try {
    const { reportId } = req.query;

    if (!reportId) {
      return res.json([]);
    }

    const report = await getOwnedReport(reportId, req.user.id);
    if (!report) {
      return res.status(404).json({ message: 'Research report not found.' });
    }

    const sessions = await BotHistory.find({
      userId: req.user.id,
      reportId
    })
      .sort({ updatedAt: -1 })
      .select('reportId title messages updatedAt createdAt');

    res.json(sessions.map(toSummary));
  } catch (err) {
    console.error('Bot history fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch bot history.' });
  }
});

// GET /api/bot/history/:id
// Load one saved Scoutly Bot chat session.
router.get('/history/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid chat session id.' });
    }

    const session = await BotHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found.' });
    }

    res.json(session);
  } catch (err) {
    console.error('Bot history load error:', err);
    res.status(500).json({ message: 'Failed to fetch conversation.' });
  }
});

// POST /api/bot/history/save
// Append a Scoutly Bot exchange. Without sessionId, this creates a new chat session.
router.post('/history/save', async (req, res) => {
  try {
    const { reportId, sessionId, title, userMessage, botMessage } = req.body;

    const report = await getOwnedReport(reportId, req.user.id);
    if (!report) {
      return res.status(404).json({ message: 'Research report not found.' });
    }

    const messagesToSave = [
      normalizeMessage(userMessage, 'user'),
      normalizeMessage(botMessage, 'bot')
    ].filter(Boolean);

    if (messagesToSave.length === 0) {
      return res.status(400).json({ message: 'No valid bot messages were provided.' });
    }

    let session = null;

    if (sessionId) {
      if (!isValidId(sessionId)) {
        return res.status(400).json({ message: 'Invalid chat session id.' });
      }

      session = await BotHistory.findOne({
        _id: sessionId,
        userId: req.user.id,
        reportId
      });

      if (!session) {
        return res.status(404).json({ message: 'Chat session not found.' });
      }
    }

    if (!session) {
      session = new BotHistory({
        userId: req.user.id,
        reportId,
        title: buildTitle(title, userMessage),
        messages: []
      });
    }

    session.messages.push(...messagesToSave);
    const saved = await session.save();

    res.status(sessionId ? 200 : 201).json(saved);
  } catch (err) {
    console.error('Bot history save error:', err);
    res.status(500).json({ message: 'Failed to save chat history.' });
  }
});

// DELETE /api/bot/history/:id
// Delete one Scoutly Bot chat session without touching research history.
router.delete('/history/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid chat session id.' });
    }

    const deleted = await BotHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Chat session not found.' });
    }

    res.json({ message: 'Chat session deleted successfully.' });
  } catch (err) {
    console.error('Bot history delete error:', err);
    res.status(500).json({ message: 'Failed to delete chat session.' });
  }
});

module.exports = router;
