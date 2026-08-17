const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  query: { type: String, required: true },
  cronExpression: { type: String, required: true, default: '0 9 * * 1' }, // Default: Every Monday at 9:00 AM
  email: { type: String, required: true },
  depth: { type: String, default: 'quick' },
  isActive: { type: Boolean, default: true },
  lastRunAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', ScheduleSchema);