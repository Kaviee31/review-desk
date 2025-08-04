// models/ZerothReview.js
const mongoose = require('mongoose');

const zerothReviewSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  studentName: String,
  registerNumber: String,
  comment: {
    type: String,
    required: true,
  },
  teacherEmail: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ZerothReview', zerothReviewSchema);
