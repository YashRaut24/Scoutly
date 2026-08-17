const mongoose = require('mongoose');

const ResearchHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  query: { type: String, required: true },
  report: { type: String, required: true },
  depth: { type: String, default: 'quick' },
  citations: { type: Object, default: {} },
  isPinned: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResearchHistory', ResearchHistorySchema);