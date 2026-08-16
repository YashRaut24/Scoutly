// server/index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// 1. Connect to Local MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/scoutly';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' Connected to Local MongoDB (scoutly)'))
  .catch((err) => console.error(' MongoDB Connection Error:', err));

// 2. Define History Schema & Model
const historySchema = new mongoose.Schema({
  query: String,
  report: String,
  depth: {
    type: String,
    default: 'quick'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const History = mongoose.model('History', historySchema);

// 3. API Endpoints

// GET all history (newest first)
app.get('/api/history', async (req, res) => {
  try {
    const history = await History.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save search history
app.post('/api/history', async (req, res) => {
  try {
    const { query, report, depth, isPinned } = req.body;
    const newHistory = new History({
      query,
      report,
      depth: depth || 'quick',
      isPinned: isPinned || false
    });

    const savedItem = await newHistory.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle pin state
app.patch('/api/history/:id/pin', async (req, res) => {
  try {
    const item = await History.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    const updated = await History.findByIdAndUpdate(
      req.params.id,
      { isPinned: !item.isPinned },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE history item by ID
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await History.findByIdAndDelete(id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`[EXPRESS] Running on http://localhost:${PORT}`));