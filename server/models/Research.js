const mongoose = require("mongoose");

const ResearchSchema = new mongoose.Schema({
  query: { type: String, required: true },
  report: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Research", ResearchSchema);
