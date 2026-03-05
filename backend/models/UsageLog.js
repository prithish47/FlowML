const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    endpoint: { type: String, required: true },
    count: { type: Number, default: 0 }
});

// Compound index for fast lookups and uniqueness
usageLogSchema.index({ userId: 1, date: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('UsageLog', usageLogSchema);
