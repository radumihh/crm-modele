const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  imageUrl: String,
  acceptedModels: [String],
  rejectedModels: [String]
});

ProjectSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('models_projects').countDocuments();
    this.id = count + 1;
  }
  next();
});

module.exports = mongoose.model('models_projects', ProjectSchema);
