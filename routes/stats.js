const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  // TODO: Implement statistics
  res.json({ message: 'Statistics endpoint' });
});

module.exports = router;
