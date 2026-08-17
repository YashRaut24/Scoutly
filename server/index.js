// server/index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// 1. Connect to Local MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/scoutly';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' Connected to Local MongoDB (scoutly)'))
  .catch((err) => console.error(' MongoDB Connection Error:', err));

const PORT = 5000;
app.listen(PORT, () => console.log(`[EXPRESS] Running on http://localhost:${PORT}`));