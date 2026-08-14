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
  query: { type: String, required: true },
  report: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
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
    const { query, report } = req.body;
    const newEntry = await History.create({ query, report });
    res.status(201).json(newEntry);
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