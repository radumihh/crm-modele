const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Model = require('../models/Model');
const { syncModels } = require('../utils/syncModels');
const fetch = require('node-fetch');
const Comment = require('../models/Comment');

router.get('/', auth, async (req, res) => {
  try {
    // First sync models to ensure images are downloaded
    await syncModels();
    
    // Then fetch fresh data from Google Sheet
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKufsvBTBhRxK161zV1jSl_wM8TGdYfGlLLLTA8Ta_tw_ImkSir2a_u2ghAUXLXfmudaxxDe-AJnnX/pub?output=tsv";
    const response = await fetch(sheetURL);
    const text = await response.text();
    
    const rows = text.split('\n').map(row => row.split('\t'));
    const headers = rows[0];
    
    // Get all models from database for image paths
    const dbModels = await Model.find({}, { email: 1, images: 1, _id: 0 });
    const modelImageMap = new Map(dbModels.map(m => [m.email, m.images || []]));

    // Merge sheet data with image paths
    const enrichedRows = rows.slice(1).map(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header.trim()] = row[index]?.trim() || '';
      });

      // Replace Google Drive URLs with local image paths
      const email = rowData['Email Address'];
      if (email && modelImageMap.has(email)) {
        const images = modelImageMap.get(email);
        if (images && images.length > 0) {
          rowData['Upload 1–3 headshots or portfolio pictures'] = images.join(',');
        }
      }

      return Object.values(rowData).join('\t');
    });

    const tsvData = [headers.join('\t'), ...enrichedRows].join('\n');
    res.set('Content-Type', 'text/tab-separated-values');
    res.send(tsvData);
    
  } catch (err) {
    console.error('Error in models route:', err);
    res.status(500).json({ error: 'Failed to fetch models data' });
  }
});

// Add this new route
router.get('/images/:email', auth, async (req, res) => {
  try {
    const model = await Model.findOne({ email: req.params.email }, { images: 1, _id: 0 });
    if (!model) {
      return res.json({ images: [] });
    }
    res.json({ images: model.images || [] });
  } catch (err) {
    console.error('Error fetching model images:', err);
    res.status(500).json({ error: 'Failed to fetch model images' });
  }
});

// Add comment route
router.post('/:email/comments', auth, async (req, res) => {
  try {
    const { projectId, text } = req.body;
    const comment = new Comment({
      modelEmail: req.params.email,
      projectId,
      text
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments route
router.get('/:email/comments', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = { modelEmail: req.params.email };
    if (projectId) {
      query.projectId = projectId;
    }
    const comments = await Comment.find(query).sort('-createdAt');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

module.exports = router;
