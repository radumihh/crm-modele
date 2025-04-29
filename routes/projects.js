const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/project-images/');
  },
  filename: function (req, file, cb) {
    cb(null, 'project-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed!'));
  }
});

// Project Schema (moved from server.js)
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

const Project = mongoose.model('models_projects', ProjectSchema);

// Project routes
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ id: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update POST route to require image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Project image is required' });
    }

    const newProject = new Project({
      name: req.body.name,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      imageUrl: `/project-images/${req.file.filename}`,
      acceptedModels: [],
      rejectedModels: []
    });
    
    const savedProject = await newProject.save();
    res.status(201).json(savedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add URL validation helper function
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/models', async (req, res) => {
  try {
    const { modelId, action } = req.body;
    const project = await Project.findOne({ id: req.params.id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (action === 'accept') {
      project.rejectedModels = project.rejectedModels.filter(id => id !== modelId);
      if (!project.acceptedModels.includes(modelId)) {
        project.acceptedModels.push(modelId);
      }
    } else if (action === 'reject') {
      project.acceptedModels = project.acceptedModels.filter(id => id !== modelId);
      if (!project.rejectedModels.includes(modelId)) {
        project.rejectedModels.push(modelId);
      }
    }

    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update PUT route to handle optional file upload
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.name = req.body.name;
    project.description = req.body.description;
    project.startDate = req.body.startDate;
    project.endDate = req.body.endDate;
    
    // Only update image if a new one was uploaded
    if (req.file) {
      project.imageUrl = `/project-images/${req.file.filename}`;
    }
    // Keep existing image if no new image was provided
    
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
