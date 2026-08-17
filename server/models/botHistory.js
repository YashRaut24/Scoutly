const mongoose = require('mongoose');

const botMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true },
    citationMap: { type: Object, default: {} },
    isError: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const botHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchHistory', required: true, index: true },
    title: { type: String, required: true },
    messages: { type: [botMessageSchema], default: [] }
  },
  { timestamps: true }
);

botHistorySchema.index({ userId: 1, reportId: 1, updatedAt: -1 });

module.exports = mongoose.model('BotHistory', botHistorySchema);
