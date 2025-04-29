const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  totalModels: {
    type: Number,
    default: 0
  },
  acceptedModels: {
    type: Number,
    default: 0
  },
  rejectedModels: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('models_stats', StatsSchema);