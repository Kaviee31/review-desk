import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import ChatUser from "./models/ChatUser.js";
import TelegramBot from "node-telegram-bot-api";



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
  courseName: String, // This field is crucial for filtering by program
  teacherName: String,
  teacherEmail: String,
  Assessment1: { type: Number, default: 0 },
  Assessment2: { type: Number, default: 0 },
  Assessment3: { type: Number, default: 0 },
  Total: { type: Number, default: 0 },
  reviews: [{ // For uploaded review documents (PDFs)
    reviewType: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  reviewsAssessment: [{
    description: String, // Description of the review item from coordinator's setup
    r1_mark: { type: Number, default: 0 },
    r2_mark: { type: Number, default: 0 },
    r3_mark: { type: Number, default: 0 },
  }],
  // NEW FIELDS FOR UG STUDENTS' PROJECT DATA
  projectName: { type: String }, // Stores the project name for the group
  groupRegisterNumbers: { type: [String], default: [] } // Stores all register numbers in the UG group
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

// SCHEMA for Coordinator Review Data (defines the structure of review items)
const coordinatorReviewSchema = new mongoose.Schema({
  coordinatorId: { type: String, required: true }, // Firebase UID of the coordinator
  program: { type: String, required: true }, // e.g., MCA(R), MTECH(SS)
  reviewData: {
    type: Array, // Array of review item objects { r1_desc, r1_mark, r2_desc, r2_mark, r3_desc, r3_mark }
    default: []
  },
  lastUpdated: { type: Date, default: Date.now } // Timestamp of last update
}, { timestamps: true });


// === MODELS ===
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
const Message = mongoose.model("Message", messageSchema);
const ReviewDeadline = mongoose.model("ReviewDeadline", reviewDeadlineSchema);
const CoordinatorReview = mongoose.model("CoordinatorReview", coordinatorReviewSchema);


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

// Enroll a student - Now expects courseName, and optionally projectName, groupRegisterNumbers
app.post("/enroll", async (req, res) => {
  // Destructure new fields: projectName and groupRegisterNumbers
  const { studentName, registerNumber, courseName, teacherName, teacherEmail, projectName, groupRegisterNumbers } = req.body;
  try {
    // Check if the student is already enrolled in this specific course
    const exists = await Enrollment.findOne({ registerNumber, courseName });
    if (exists) return res.status(400).json({ error: `Student ${registerNumber} already enrolled in ${courseName}!` });

    // Create a new enrollment document including the new fields
    const newEnrollment = new Enrollment({
      studentName,
      registerNumber,
      courseName,
      teacherName,
      teacherEmail,
      reviewsAssessment: [], // Initialize as empty, will be populated by teacher
      projectName: projectName || null, // Store project name (null if not provided)
      groupRegisterNumbers: groupRegisterNumbers || [] // Store group register numbers (empty array if not provided)
    });
    await newEnrollment.save();
    res.status(200).json({ message: "Enrollment successful!" });
  } catch (error) {
    console.error("Error during student enrollment:", error);
    res.status(500).json({ error: "Failed to enroll student." });
  }
});

app.post("/api/save-telegram-id", async (req, res) => {
  const { registerNumber, chatId } = req.body;

  try {
    const existing = await ChatUser.findOne({ registerNumber });

    if (existing) {
      existing.chatId = chatId;
      await existing.save();
    } else {
      await ChatUser.create({ registerNumber, chatId });
    }

    res.json({ success: true, message: "Telegram chat ID saved!" });
  } catch (error) {
    console.error("Failed to save Telegram chat ID:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/telegram-status/:registerNumber", async (req, res) => {
  try {
    const user = await ChatUser.findOne({ registerNumber: req.params.registerNumber });
    if (user) {
      res.json({ linked: true });
    } else {
      res.json({ linked: false });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to check Telegram status" });
  }
});

app.post("/api/send-telegram", async (req, res) => {
  const { message, registerNumbers } = req.body;

  if (!message || !Array.isArray(registerNumbers)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const chatUsers = await ChatUser.find({
      registerNumber: { $in: registerNumbers },
    });

    if (chatUsers.length === 0) {
      return res.status(404).json({ error: "No chat IDs found for these register numbers." });
    }

    const sendPromises = chatUsers.map(user =>
      bot.sendMessage(user.chatId, `📢 ${message}`)
    );

    await Promise.all(sendPromises);

    res.json({ success: true, sent: chatUsers.length });
  } catch (error) {
    console.error("Error sending Telegram messages:", error);
    res.status(500).json({ error: "Failed to send Telegram messages" });
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

// MODIFIED: Get students for a teacher, now with optional courseName filter
app.get("/teacher-students/:teacherEmail", async (req, res) => {
  const { teacherEmail } = req.params;
  const { courseName } = req.query; // Get courseName from query parameter

  let query = { teacherEmail }; // Start with teacherEmail filter

  if (courseName) {
    query.courseName = courseName; // Add courseName filter if provided
  }

  try {
    const students = await Enrollment.find(query);
    res.json(students);
  } catch (error) {
    console.error("Error fetching teacher's students:", error);
    res.status(500).json({ error: "Failed to fetch teacher's students" });
  }
});

// NEW ENDPOINT: Get all students for a specific program (courseName) - for HOD Dashboard
app.get("/students-by-program/:programName", async (req, res) => {
  const { programName } = req.params;
  try {
    const students = await Enrollment.find({ courseName: programName });
    res.json(students);
  } catch (error) {
    console.error(`Error fetching students for program ${programName}:`, error);
    res.status(500).json({ error: `Failed to fetch students for program ${programName}.` });
  }
});

// NEW ENDPOINT: Get UG projects for a teacher by courseName
app.get("/teacher-ug-projects/:teacherEmail/:courseName", async (req, res) => {
  const { teacherEmail, courseName } = req.params;

  try {
    const projects = await Enrollment.aggregate([
      {
        $match: {
          teacherEmail: teacherEmail,
          courseName: courseName,
          projectName: { $ne: null, $exists: true, $ne: '' } // Only consider entries with a project name
        }
      },
      {
        $group: {
          _id: "$projectName", // Group by project name
          projectMembers: { $addToSet: { // Collect unique student details for the group
            registerNumber: "$registerNumber",
            studentName: "$studentName",
            teacherEmail: "$teacherEmail", // Include teacherEmail for consistency
            courseName: "$courseName",
            Assessment1: "$Assessment1",
            Assessment2: "$Assessment2",
            Assessment3: "$Assessment3",
            Total: "$Total",
            // Assuming Contact is not directly in Enrollment, but adding a placeholder
            // You might need to fetch this from Firebase 'users' collection or join later
            Contact: null // Placeholder, you might want to fetch this
          }},
          // Get the Assessment values from one of the members.
          // This implicitly assumes all members of a project will have the same assessment values
          // if the frontend updates them collectively.
          Assessment1: { $first: "$Assessment1" },
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" }, // Include Total as per request for consistency
          groupRegisterNumbers: { $addToSet: "$registerNumber" },
          reviewsAssessment: { $first: "$reviewsAssessment" } // Get the first reviewsAssessment found for the project
        }
      },
      {
        $project: {
          projectName: "$_id",
          projectMembers: 1, // Array of { registerNumber, studentName, ... }
          Assessment1: 1, // Use the fetched Assessment1
          Assessment2: 1, // Use the fetched Assessment2
          Assessment3: 1, // Use the fetched Assessment3
          Total: 1,
          groupRegisterNumbers: 1,
          reviewsAssessment: 1 // Pass through the first found reviewsAssessment
        }
      }
    ]);
    res.json(projects);
  } catch (error) {
    console.error(`Error fetching UG projects for teacher ${teacherEmail} in ${courseName}:`, error);
    res.status(500).json({ error: `Failed to fetch UG projects for ${courseName}.` });
  }
});


// Update assessment marks (can be extended to update reviewsAssessment)
app.post("/update-marks", async (req, res) => {
  try {
    const { students } = req.body; // 'students' is an array of student objects to update
    for (const student of students) {
      // Find the existing enrollment by registerNumber and courseName
      await Enrollment.findOneAndUpdate(
        { registerNumber: student.registerNumber, courseName: student.courseName },
        {
          $set: {
            Assessment1: Number(student.Assessment1) || 0,
            Assessment2: Number(student.Assessment2) || 0,
            Assessment3: Number(student.Assessment3) || 0,
            Total: Number(student.Total) || 0,
            // Only set reviewsAssessment if it's explicitly provided and valid
            ...(Array.isArray(student.reviewsAssessment) && { reviewsAssessment: student.reviewsAssessment })
          }
        },
        { new: true, upsert: false } // upsert: false because enrollment should already exist
      );
    }
    res.json({ message: "Marks updated successfully!" });
  } catch (error) {
    console.error("Error saving marks:", error);
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

// API ENDPOINTS FOR COORDINATOR REVIEW DATA (defines review item structure)
// Save coordinator review data
app.post("/coordinator-reviews", async (req, res) => {
  const { coordinatorId, program, reviewData } = req.body;
  if (!coordinatorId || !program || !reviewData) {
    return res.status(400).json({ error: "Missing required fields: coordinatorId, program, reviewData." });
  }

  try {
    const updatedReview = await CoordinatorReview.findOneAndUpdate(
      { coordinatorId, program },
      { reviewData, lastUpdated: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "Coordinator review data saved successfully!", data: updatedReview });
  } catch (error) {
    console.error("Error saving coordinator review data:", error);
    res.status(500).json({ error: "Failed to save coordinator review data." });
  }
});

// Get coordinator review data (used by CoordinatorDashboard & EnrolledStudents)
app.get("/coordinator-reviews/:coordinatorId/:program", async (req, res) => {
  const { coordinatorId, program } = req.params;
  try {
    const review = await CoordinatorReview.findOne({ coordinatorId, program });
    if (!review) {
      return res.status(200).json({ reviewData: [] }); // Return empty array if no coordinator data
    }
    res.status(200).json(review);
  } catch (error) {
    console.error("Error fetching coordinator review data:", error);
    res.status(500).json({ error: "Failed to fetch coordinator review data." });
  }
});


// NEW API ENDPOINTS for student review marks (teacher's side)

// GET student's review marks for a specific program (modified for UG project reflection)
app.get("/student-review-marks/:registerNumber/:courseName", async (req, res) => {
  const { registerNumber, courseName } = req.params;
  try {
    // First, find the current student's enrollment
    const currentStudentEnrollment = await Enrollment.findOne({ registerNumber, courseName });

    if (!currentStudentEnrollment) {
      return res.status(404).json({ error: "Student enrollment not found for this course." });
    }

    // If it's a UG project student and has a project name and group members
    if (currentStudentEnrollment.projectName && currentStudentEnrollment.groupRegisterNumbers && currentStudentEnrollment.groupRegisterNumbers.length > 0) {
      // Find one student from the same project with reviewAssessment data to ensure consistency
      // This assumes that reviewAssessment data will be the same for all members of a project.
      const projectMemberWithReview = await Enrollment.findOne({
        projectName: currentStudentEnrollment.projectName,
        courseName: courseName,
        reviewsAssessment: { $exists: true, $not: { $size: 0 } } // Find one with non-empty reviewsAssessment
      });

      if (projectMemberWithReview) {
        return res.status(200).json({ reviewsAssessment: projectMemberWithReview.reviewsAssessment || [] });
      }
      // If no member of the project has reviewsAssessment, return empty
      return res.status(200).json({ reviewsAssessment: [] });

    } else {
      // For PG students or UG students not part of a group/project
      return res.status(200).json({ reviewsAssessment: currentStudentEnrollment.reviewsAssessment || [] });
    }

  } catch (error) {
    console.error("Error fetching student review marks:", error);
    res.status(500).json({ error: "Failed to fetch student review marks." });
  }
});

// POST/PUT student's review marks for a specific program
app.post("/student-review-marks", async (req, res) => {
  const { registerNumber, courseName, reviewsAssessment } = req.body;
  if (!registerNumber || !courseName || !Array.isArray(reviewsAssessment)) {
    return res.status(400).json({ error: "Missing required fields or invalid format." });
  }

  try {
    const updatedEnrollment = await Enrollment.findOneAndUpdate(
      { registerNumber, courseName },
      { $set: { reviewsAssessment: reviewsAssessment } },
      { new: true, upsert: false } // upsert: false because enrollment should already exist
    );

    if (!updatedEnrollment) {
      return res.status(404).json({ error: "Student enrollment not found for this course." });
    }

    res.status(200).json({ message: "Student review marks saved successfully!", data: updatedEnrollment.reviewsAssessment });
  } catch (error) {
    console.error("Error saving student review marks:", error);
    res.status(500).json({ error: "Failed to save student review marks." });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

