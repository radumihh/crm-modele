const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  modelEmail: {
    type: String,
    required: true
  },
  projectId: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', commentSchema);
