import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// === SCHEMAS ===
const enrollmentSchema = new mongoose.Schema({
  studentName: String,
  registerNumber: String,
  courseName: String,
  teacherName: String,
  teacherEmail: String,
  Assessment1: { type: Number, default: 0 },
  Assessment2: { type: Number, default: 0 },
  Assessment3: { type: Number, default: 0 },
  Total: { type: Number, default: 0 },
  reviews: [{
    reviewType: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
});

const messageSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

const reviewDeadlineSchema = new mongoose.Schema({
  zerothReviewDeadline: Date,
  firstReviewDeadline: Date,
  secondReviewDeadline: Date,
}, { timestamps: true });

// === MODELS ===
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
const Message = mongoose.model("Message", messageSchema);
const ReviewDeadline = mongoose.model("ReviewDeadline", reviewDeadlineSchema);

// === MULTER CONFIG ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => file.mimetype === "application/pdf" ? cb(null, true) : cb(null, false),
  limits: { fileSize: 8 * 1024 * 1024 }
});

// === ROUTES ===

// Enroll a student
app.post("/enroll", async (req, res) => {
  const { studentName, registerNumber, courseName, teacherName, teacherEmail } = req.body;
  try {
    const exists = await Enrollment.findOne({ registerNumber, courseName });
    if (exists) return res.status(400).json({ error: "Already enrolled!" });

    const newEnrollment = new Enrollment({ studentName, registerNumber, courseName, teacherName, teacherEmail });
    await newEnrollment.save();
    res.status(200).json({ message: "Enrollment successful!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to enroll" });
  }
});

// Get courses enrolled by a student
app.get("/student-courses/:registerNumber", async (req, res) => {
  try {
    const courses = await Enrollment.find({ registerNumber: req.params.registerNumber });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Error fetching student courses" });
  }
});

// Get all unique students
app.get("/all-students", async (req, res) => {
  try {
    const students = await Enrollment.aggregate([
      { $group: { _id: "$registerNumber", studentName: { $first: "$studentName" } } },
      { $project: { _id: 0, registerNumber: "$_id", studentName: 1, email: { $concat: ["$_id", "@student.annauniv.edu"] } } }
    ]);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Get all students for a teacher's course
app.get("/teacher-courses/:teacherEmail", async (req, res) => {
  try {
    const students = await Enrollment.find({ teacherEmail: req.params.teacherEmail });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch teacher's students" });
  }
});

// Update assessment marks
app.post("/update-marks", async (req, res) => {
  try {
    const { students } = req.body;
    for (const student of students) {
      await Enrollment.findOneAndUpdate(
        { registerNumber: student.registerNumber, courseName: student.courseName },
        { $set: student },
        { new: true, upsert: true }
      );
    }
    res.json({ message: "Marks updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update marks" });
  }
});

// Post a chat message
app.post("/post-message", async (req, res) => {
  try {
    const newMessage = new Message({ content: req.body.content });
    await newMessage.save();
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get all chat messages
app.get("/all-messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Upload review document
app.post("/upload-review", upload.single("reviewFile"), async (req, res) => {
  const { registerNumber, reviewType } = req.body;
  if (!req.file) return res.status(400).json({ error: "No file uploaded or invalid format." });

  try {
    const enrollment = await Enrollment.findOne({ registerNumber });
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });

    const existingIndex = enrollment.reviews.findIndex(r => r.reviewType === reviewType);
    const newReview = { reviewType, filePath: req.file.path, uploadedAt: Date.now() };

    if (existingIndex > -1) enrollment.reviews[existingIndex] = newReview;
    else enrollment.reviews.push(newReview);

    await enrollment.save();
    res.json({ message: `Successfully uploaded ${reviewType} review.` });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload review." });
  }
});

// Get latest uploaded review for a student
app.get("/get-latest-review/:registerNumber/:reviewType", async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ registerNumber: req.params.registerNumber });
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });

    const review = enrollment.reviews
      .filter(r => r.reviewType === req.params.reviewType)
      .sort((a, b) => b.uploadedAt - a.uploadedAt)[0];

    if (!review) return res.status(404).json({ error: "Review not found." });

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch review." });
  }
});

// Set review deadlines
app.post("/set-review-dates", async (req, res) => {
  try {
    await ReviewDeadline.updateOne({}, req.body, { upsert: true });
    res.json({ message: "Review deadlines updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to set review dates" });
  }
});

// Get review deadlines
app.get("/get-review-dates", async (req, res) => {
  try {
    const deadlines = await ReviewDeadline.findOne().sort({ createdAt: -1 });
    res.json(deadlines || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch review dates" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
