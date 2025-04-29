const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  email: String,
  name: String,
  phone: String,
  age: String,
  gender: String,
  city: String,
  height: String,
  weight: String,
  hairColor: String,
  eyeColor: String,
  image: String, // Keep for backward compatibility
  images: {
    type: [String],
    default: []
  }, // Array of local image paths
  features: String,
  languages: String,
  description: String,
  skills: String,
  hobbies: String,
  instagram: String,
  tiktok: String,
  otherSocial: String,
  projectInterests: String,
  inPerson: String,
  travel: String,
  originalImageUrl: String,
  githubImageUrl: String,
  updated: { type: Date, default: Date.now }
});

// Add a pre-save hook to ensure image consistency
modelSchema.pre('save', function(next) {
  // If we have images array but no primary image, set first image as primary
  if ((!this.image || this.image.trim() === '') && this.images && this.images.length > 0) {
    this.image = this.images[0];
  }
  
  // If we have a primary image but no images array, initialize it
  if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
  
  next();
});

module.exports = mongoose.model('Model', modelSchema);
