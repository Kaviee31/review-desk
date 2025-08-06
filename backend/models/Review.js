// models/ZerothReview.js
import mongoose from 'mongoose'; // Use import

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

const ZerothReview = mongoose.model('ZerothReview', zerothReviewSchema); // Define the model
export default ZerothReview; // <--- Change to export default