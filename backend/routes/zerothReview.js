// routes/zerothReview.js
const express = require('express');
const ZerothReview = require('../models/ZerothReview');
const router = express.Router();

// Save Zeroth Review comment
router.post('/add', async (req, res) => {
  try {
    const review = new ZerothReview(req.body);
    await review.save();
    res.status(201).json({ message: 'Zeroth review comment saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// Get by studentId
router.get('/student/:id', async (req, res) => {
  const reviews = await ZerothReview.find({ studentId: req.params.id });
  res.json(reviews);
});

// HOD - Get all
router.get('/all', async (req, res) => {
  const reviews = await ZerothReview.find();
  res.json(reviews);
});

module.exports = router;
