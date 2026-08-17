const mongoose = require('mongoose');

const researchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true },
    report: { type: String, required: true },
    depth: { type: String, default: 'quick' },
    citations: { type: Object, default: {} },
    isPinned: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResearchHistory', researchHistorySchema);
