import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import ChatUser from "./models/ChatUser.js";
import bot from './telegramBot.js';
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads")); // Serve static files from the 'uploads' directory


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// === SCHEMAS ===
const enrollmentSchema = new mongoose.Schema({
  studentName: String,
  registerNumber: String,
  email: String,
  courseName: String, // This field is crucial for filtering by program
  teacherName: String,
  teacherEmail: String,
  Assessment1: { type: Number, default: 0 },
  Assessment2: { type: Number, default: 0 },
  Assessment3: { type: Number, default: 0 },
  Total: { type: Number, default: 0 },
  reviews: [{ // For uploaded review documents (PDFs, PPTs, Other)
    reviewType: String, // e.g., "zeroth", "first", "second", "third"
    pdfPath: String,    // Path for PDF file
    pptPath: String,    // Path for PPT file
    otherPath: String,  // Path for any other document
    uploadedAt: { type: Date, default: Date.now },
  }],
  reviewsAssessment: [{
    description: String, // Description of the review item from coordinator's setup
    r1_mark: { type: Number, default: 0 },
    r2_mark: { type: Number, default: 0 },
    r3_mark: { type: Number, default: 0 },
  }],
  // NEW: Fields for Viva Voce marks
  viva: {
    guide: { type: Number, default: 0 },
    panel: { type: Number, default: 0 },
    external: { type: Number, default: 0 },
  },
  viva_total_awarded: { type: Number, default: 0 },
  // NEW FIELDS FOR UG STUDENTS' PROJECT DATA
  projectName: { type: String }, // Stores the project name for the group
  groupRegisterNumbers: { type: [String], default: [] },// Stores all register numbers in the UG group
  zerothReviewComment: { type: String, default: "" }
});

const messageSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

// MODIFIED: reviewDeadlineSchema to include courseName and third review deadline
const reviewDeadlineSchema = new mongoose.Schema({
  courseName: { type: String, required: true, unique: true }, // Each course has its own deadlines
  zerothReviewDeadline: Date,
  firstReviewDeadline: Date,
  secondReviewDeadline: Date,
  thirdReviewDeadline: Date, // NEW: Third review deadline
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
  destination: (req, file, cb) => cb(null, "uploads/"), // Files will be saved in the 'uploads' folder
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Use path.basename to get just the filename, then path.extname for the extension
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

// Updated file filter to accept PDF, PPT, and common document types
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "text/plain", // .txt
      "image/jpeg", // .jpeg, .jpg
      "image/png", // .png
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PPT, Word, Excel, Text, Image files are allowed."), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// === ROUTES ===

// Enroll a student - Now expects courseName, and optionally projectName, groupRegisterNumbers
app.post("/enroll", async (req, res) => {
  // Destructure new fields: projectName and groupRegisterNumbers
  const { studentName, registerNumber, courseName, teacherName, teacherEmail, projectName, groupRegisterNumbers, email } = req.body;
  try {
    // Check if the student is already enrolled in this specific course
    const exists = await Enrollment.findOne({ registerNumber, courseName });
    if (exists) return res.status(400).json({ error: `Student ${registerNumber} already enrolled in ${courseName}!` });

    // Create a new enrollment document including the new fields
    const newEnrollment = new Enrollment({
      studentName,
      registerNumber,
      email,
      courseName,
      teacherName,
      teacherEmail,
      reviewsAssessment: [], 
      projectName: projectName || null, 
      groupRegisterNumbers: groupRegisterNumbers || [] 
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

    let successCount = 0;
    for (const user of chatUsers) {
      try {
        console.log("➡️ Sending to:", user.chatId);
        await bot.sendMessage(user.chatId, message); // ✅ this is the actual send
        successCount++;
      } catch (err) {
        console.error("❌ Failed to send to:", user.chatId, err.message);
      }
    }

    res.json({ success: true, successCount, message: "Telegram messages sent." });
  } catch (error) {
    console.error("Error sending Telegram messages:", error);
    res.status(500).json({ error: "Failed to send Telegram messages" });
  }
});



app.get("/student-zeroth-review/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;

  try {
    const student = await Enrollment.findOne({
      $or: [
        { registerNumber: registerNumber },
        { "projectMembers.registerNumber": registerNumber }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Return the comment if it exists, otherwise an empty string
    res.status(200).json({ comment: student.zerothReviewComment || "" });
  } catch (error) {
    console.error("Error fetching student zeroth review comment:", error);
    res.status(500).json({ error: "Failed to fetch student zeroth review comment." });
  }
});

app.post("/zeroth-review/submit", async (req, res) => {
  const { registerNumber, projectName, comment, teacherEmail } = req.body;
  try {
    let result;
    if (registerNumber) {
      // Logic for PG students
      result = await Enrollment.findOneAndUpdate(
        { registerNumber },
        { $set: { zerothReviewComment: comment } },
        { new: true }
      );
    } else if (projectName) {
      // Logic for UG projects, update all students in the project
      result = await Enrollment.updateMany(
        { projectName },
        { $set: { zerothReviewComment: comment } },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: "Invalid request. Must provide either registerNumber or projectName." });
    }

    if (!result) {
      return res.status(404).json({ error: "Student or project not found." });
    }
    res.status(200).json({ message: "Zeroth review comment submitted successfully." });
  } catch (error) {
    console.error("Error submitting zeroth review comment:", error);
    res.status(500).json({ error: "Failed to submit zeroth review comment." });
  }
});

app.get("/student-courses/:registerNumber", async (req, res) => {
  try {
    const courses = await Enrollment.find({ registerNumber: req.params.registerNumber });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Error fetching student courses" });
  }
});
app.get("/teacher-courses/:email", async (req, res) => {
  const teacherEmail = req.params.email;
  try {
    const students = await Enrollment.find({ teacherEmail });
    res.json(students);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
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
            viva: "$viva", // MODIFIED: Include the full viva object for each member
            viva_total_awarded: "$viva_total_awarded", // Include viva marks for each member
            Contact: null // Placeholder, you might want to fetch this
          }},
         
          Assessment1: { $first: "$Assessment1" },
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" }, // Include Total as per request for consistency
          viva_total_awarded: { $first: "$viva_total_awarded" }, // Get the first viva total for the project
          groupRegisterNumbers: { $addToSet: "$registerNumber" },
          reviewsAssessment: { $first: "$reviewsAssessment" } // Get the first reviewsAssessment found for the project
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id",
          projectMembers: 1, // Array of { registerNumber, studentName, ... }
          Assessment1: 1, // Use the fetched Assessment1
          Assessment2: 1, // Use the fetched Assessment2
          Assessment3: 1, // Use the fetched Assessment3
          Total: 1,
          viva_total_awarded: 1, // Pass through the viva total
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
       // MODIFIED: Prepare a dynamic update object
      const updateFields = {
        Assessment1: Number(student.Assessment1) || 0,
        Assessment2: Number(student.Assessment2) || 0,
        Assessment3: Number(student.Assessment3) || 0,
        Total: Number(student.Total) || 0,
      };

      // If reviewsAssessment is passed, include it in the update
      if (student.reviewsAssessment && Array.isArray(student.reviewsAssessment)) {
        updateFields.reviewsAssessment = student.reviewsAssessment;
      }

      // If viva marks are passed, include them and calculate the total
      if (student.viva) {
        updateFields.viva = student.viva;
        updateFields.viva_total_awarded = (Number(student.viva.guide) || 0) + (Number(student.viva.panel) || 0) + (Number(student.viva.external) || 0);
      }

      // Find the existing enrollment by registerNumber and courseName and update it
      await Enrollment.findOneAndUpdate(
        { registerNumber: student.registerNumber, courseName: student.courseName },
        { $set: updateFields },
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

// MODIFIED: Upload review document to handle multiple file types including third review
app.post("/upload-review", upload.fields([
  { name: 'zerothPdf', maxCount: 1 },
  { name: 'zerothPpt', maxCount: 1 },
  { name: 'zerothOther', maxCount: 1 },
  { name: 'firstPdf', maxCount: 1 },
  { name: 'firstPpt', maxCount: 1 },
  { name: 'firstOther', maxCount: 1 },
  { name: 'secondPdf', maxCount: 1 },
  { name: 'secondPpt', maxCount: 1 },
  { name: 'secondOther', maxCount: 1 },
  { name: 'thirdPdf', maxCount: 1 }, // NEW: Third review PDF
  { name: 'thirdPpt', maxCount: 1 }, // NEW: Third review PPT
  { name: 'thirdOther', maxCount: 1 }, // NEW: Third review Other
]), async (req, res) => {
  const { registerNumber, reviewType } = req.body; // reviewType will be 'zeroth', 'first', 'second', or 'third'
  const files = req.files;

  if (!registerNumber || !reviewType) {
    return res.status(400).json({ error: "Missing registerNumber or reviewType." });
  }

  try {
    const enrollment = await Enrollment.findOne({ registerNumber });
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found." });
    }

    let reviewEntry = enrollment.reviews.find(r => r.reviewType === reviewType);

    if (!reviewEntry) {
      reviewEntry = { reviewType };
      enrollment.reviews.push(reviewEntry);
    }

    // Update paths based on uploaded files
    if (files[`${reviewType}Pdf`] && files[`${reviewType}Pdf`][0]) {
      reviewEntry.pdfPath = files[`${reviewType}Pdf`][0].path.replace(/\\/g, '/');
    }
    if (files[`${reviewType}Ppt`] && files[`${reviewType}Ppt`][0]) {
      reviewEntry.pptPath = files[`${reviewType}Ppt`][0].path.replace(/\\/g, '/');
    }
    if (files[`${reviewType}Other`] && files[`${reviewType}Other`][0]) {
      reviewEntry.otherPath = files[`${reviewType}Other`][0].path.replace(/\\/g, '/');
    }
    reviewEntry.uploadedAt = Date.now(); // Update timestamp on any upload

    await enrollment.save();
    res.json({
      message: `Successfully uploaded files for ${reviewType} review.`,
      // Return all paths for the updated review entry
      filePath: {
        pdfPath: reviewEntry.pdfPath || null,
        pptPath: reviewEntry.pptPath || null,
        otherPath: reviewEntry.otherPath || null,
      }
    });
  } catch (error) {
    console.error("Error uploading review:", error);
    res.status(500).json({ error: error.message || "Failed to upload review." });
  }
});

// MODIFIED: Get latest uploaded review for a student - returns all file types
app.get("/get-latest-review/:registerNumber/:reviewType", async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ registerNumber: req.params.registerNumber });
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });

    const review = enrollment.reviews
      .filter(r => r.reviewType === req.params.reviewType)
      .sort((a, b) => b.uploadedAt - a.uploadedAt)[0]; // Get the latest one

    if (!review) {
      // Return null for all paths and uploadedAt if no review of that type is found
      return res.json({ pdfPath: null, pptPath: null, otherPath: null, uploadedAt: null });
    }

    // Return all paths and uploadedAt for the found review
    res.json({
      pdfPath: review.pdfPath || null,
      pptPath: review.pptPath || null,
      otherPath: review.otherPath || null,
      uploadedAt: review.uploadedAt, // Include uploadedAt
    });
  } catch (error) {
    console.error("Error fetching latest review:", error);
    res.status(500).json({ error: "Failed to fetch review." });
  }
});


// MODIFIED: Set review deadlines - now requires courseName and includes third review deadline
app.post("/set-review-dates", async (req, res) => {
  const { courseName, zerothReviewDeadline, firstReviewDeadline, secondReviewDeadline, thirdReviewDeadline } = req.body;
  if (!courseName) {
    return res.status(400).json({ error: "Course name is required to set review deadlines." });
  }
  try {
    await ReviewDeadline.updateOne(
      { courseName: courseName }, // Find by courseName
      { zerothReviewDeadline, firstReviewDeadline, secondReviewDeadline, thirdReviewDeadline }, // Include third review deadline
      { upsert: true } // Create if not exists
    );
    res.json({ message: `Review deadlines for ${courseName} updated successfully!` });
  } catch (error) {
    console.error("Error setting review dates:", error);
    res.status(500).json({ error: "Failed to set review dates" });
  }
});

// MODIFIED: Get review deadlines - now requires courseName as query param and includes third review deadline
app.get("/get-review-dates", async (req, res) => {
  const { courseName } = req.query; // Get courseName from query parameter
  if (!courseName) {
    return res.status(400).json({ error: "Course name is required to get review deadlines." });
  }
  try {
    const deadlines = await ReviewDeadline.findOne({ courseName: courseName });
    res.json(deadlines || {}); // Return empty object if no deadlines found for the course
  } catch (error) {
    console.error("Error fetching review dates:", error);
    res.status(500).json({ error: "Failed to fetch review dates" });
  }
});

// NEW ENDPOINT: Get student emails by courseName
app.get("/student-emails-by-course/:courseName", async (req, res) => {
  const { courseName } = req.params;
  try {
    const students = await Enrollment.find({ courseName: courseName }, { email: 1, _id: 0 }); // Project only email field
    const emails = students.map(student => student.email).filter(email => email); // Extract emails and filter out null/undefined
    res.json(emails);
  } catch (error) {
    console.error(`Error fetching student emails for course ${courseName}:`, error);
    res.status(500).json({ error: `Failed to fetch student emails for course ${courseName}.` });
  }
});


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


// MODIFIED: Get student review marks, now includes viva marks
app.get("/student-review-marks/:registerNumber/:courseName", async (req, res) => {
  const { registerNumber, courseName } = req.params;
  try {
    const currentStudentEnrollment = await Enrollment.findOne({ registerNumber, courseName });
    if (!currentStudentEnrollment) {
      return res.status(404).json({ error: "Student enrollment not found for this course." });
    }

    if (currentStudentEnrollment.projectName && currentStudentEnrollment.groupRegisterNumbers?.length > 0) {
      const projectMemberWithReview = await Enrollment.findOne({
        projectName: currentStudentEnrollment.projectName,
        courseName: courseName,
        reviewsAssessment: { $exists: true, $not: { $size: 0 } }
      });

      if (projectMemberWithReview) {
        return res.status(200).json({
          reviewsAssessment: projectMemberWithReview.reviewsAssessment || [],
          viva: projectMemberWithReview.viva || { guide: 0, panel: 0, external: 0 },
          viva_total_awarded: projectMemberWithReview.viva_total_awarded || 0,
        });
      }
      return res.status(200).json({ reviewsAssessment: [], viva: { guide: 0, panel: 0, external: 0 }, viva_total_awarded: 0 });
    } else {
      return res.status(200).json({
        reviewsAssessment: currentStudentEnrollment.reviewsAssessment || [],
        viva: currentStudentEnrollment.viva || { guide: 0, panel: 0, external: 0 },
        viva_total_awarded: currentStudentEnrollment.viva_total_awarded || 0,
      });
    }
  } catch (error) {
    console.error("Error fetching student review marks:", error);
    res.status(500).json({ error: "Failed to fetch student review marks." });
  }
});

// MODIFIED: POST student's review marks, now includes viva marks
app.post("/student-review-marks", async (req, res) => {
  const { registerNumber, courseName, reviewsAssessment, viva, viva_total_awarded } = req.body;
  if (!registerNumber || !courseName || !Array.isArray(reviewsAssessment)) {
    return res.status(400).json({ error: "Missing required fields or invalid format." });
  }

  try {
    const updatedEnrollment = await Enrollment.findOneAndUpdate(
      { registerNumber, courseName },
      { 
        $set: { 
          reviewsAssessment: reviewsAssessment,
          viva: viva,
          viva_total_awarded: viva_total_awarded,
        } 
      },
      { new: true, upsert: false }
    );

    if (!updatedEnrollment) {
      return res.status(404).json({ error: "Student enrollment not found for this course." });
    }

    res.status(200).json({ message: "Student review marks saved successfully!", data: updatedEnrollment });
  } catch (error) {
    console.error("Error saving student review marks:", error);
    res.status(500).json({ error: "Failed to save student review marks." });
  }
});



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
          projectMembers: {
            $addToSet: { // Collect unique student details for the group
              registerNumber: "$registerNumber",
              studentName: "$studentName",
              teacherEmail: "$teacherEmail", // Include teacherEmail for consistency
              courseName: "$courseName",
              Assessment1: "$Assessment1",
              Assessment2: "$Assessment2",
              Assessment3: "$Assessment3",
              Total: "$Total",
              viva: "$viva", // MODIFIED: Include the full viva object for each member
              viva_total_awarded: "$viva_total_awarded", // Include viva marks for each member
              Contact: null // Placeholder, you might want to fetch this
            }
          },

          Assessment1: { $first: "$Assessment1" },
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" }, // Include Total as per request for consistency
          viva_total_awarded: { $first: "$viva_total_awarded" }, // Get the first viva total for the project
          groupRegisterNumbers: { $addToSet: "$registerNumber" },
          reviewsAssessment: { $first: "$reviewsAssessment" } // Get the first reviewsAssessment found for the project
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id",
          projectMembers: 1, // Array of { registerNumber, studentName, ... }
          Assessment1: 1, // Use the fetched Assessment1
          Assessment2: 1, // Use the fetched Assessment2
          Assessment3: 1, // Use the fetched Assessment3
          Total: 1,
          viva_total_awarded: 1, // Pass through the viva total
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

// =====================================================================================
// === NEW ROUTE FOR COORDINATOR STUDENT VIEW ===
// =====================================================================================
app.get("/ug-projects-by-program/:programName", async (req, res) => {
  const { programName } = req.params;

  try {
    const projects = await Enrollment.aggregate([
      {
        $match: {
          courseName: programName,
          projectName: { $ne: null, $exists: true, $ne: '' } // Only consider entries with a project name
        }
      },
      {
        $group: {
          _id: "$projectName", // Group by project name
          projectMembers: {
            $addToSet: { // Collect unique student details for the group
              registerNumber: "$registerNumber",
              studentName: "$studentName",
              teacherEmail: "$teacherEmail",
              courseName: "$courseName",
              Assessment1: "$Assessment1",
              Assessment2: "$Assessment2",
              Assessment3: "$Assessment3",
              Total: "$Total",
              viva: "$viva",
              viva_total_awarded: "$viva_total_awarded",
              Contact: null
            }
          },
          Assessment1: { $first: "$Assessment1" },
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" },
          viva_total_awarded: { $first: "$viva_total_awarded" },
          groupRegisterNumbers: { $addToSet: "$registerNumber" },
          reviewsAssessment: { $first: "$reviewsAssessment" }
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id",
          projectMembers: 1,
          Assessment1: 1,
          Assessment2: 1,
          Assessment3: 1,
          Total: 1,
          viva_total_awarded: 1,
          groupRegisterNumbers: 1,
          reviewsAssessment: 1
        }
      }
    ]);
    res.json(projects);
  } catch (error) {
    console.error(`Error fetching UG projects for program ${programName}:`, error);
    res.status(500).json({ error: `Failed to fetch UG projects for program ${programName}.` });
  }
});




app.get('/ug-projects/:programName', async (req, res) => {
  const { programName } = req.params;
  try {
    const projects = await Enrollment.aggregate([
      {
        $match: {
          courseName: programName,
          projectName: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$projectName",
          projectMembers: {
            $push: {
              studentName: "$studentName",
              registerNumber: "$registerNumber",
            }
          },
          teacherName: { $first: "$teacherName" },
          zerothReviewComment: { $first: "$zerothReviewComment" },
          Assessment1: { $first: "$Assessment1" }, // Added marks
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" }
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id",
          projectMembers: 1,
          teacherName: 1,
          zerothReviewComment: 1,
          Assessment1: 1, // Projecting marks
          Assessment2: 1,
          Assessment3: 1,
          Total: 1
        }
      }
    ]);
    res.json(projects);
  } catch (error) {
    console.error(`Error fetching UG projects for HOD:`, error);
    res.status(500).json({ error: "Failed to fetch UG projects" });
  }
});

app.get('/teacher-ug-projects/:teacherEmail/:programName', async (req, res) => {
  const { teacherEmail, programName } = req.params;
  try {
    const projects = await Enrollment.aggregate([
      {
        $match: {
          courseName: programName,
          teacherEmail: teacherEmail
        }
      },
      {
        $group: {
          _id: "$projectName",
          projectMembers: {
            $push: {
              studentName: "$studentName",
              registerNumber: "$registerNumber",
              email: "$email",
              teacherName: "$teacherName", // Added for consistency
              teacherEmail: "$teacherEmail", // Added for consistency
              courseName: "$courseName",
              Assessment1: "$Assessment1",
              Assessment2: "$Assessment2",
              Assessment3: "$Assessment3",
              Total: "$Total",
              viva: "$viva",
              viva_total_awarded: "$viva_total_awarded",
              zerothReviewComment: "$zerothReviewComment", // Added
              reviewsAssessment: "$reviewsAssessment",
              Contact: null
            }
          },
          Assessment1: { $first: "$Assessment1" },
          Assessment2: { $first: "$Assessment2" },
          Assessment3: { $first: "$Assessment3" },
          Total: { $first: "$Total" },
          viva_total_awarded: { $first: "$viva_total_awarded" },
          groupRegisterNumbers: { $addToSet: "$registerNumber" },
          reviewsAssessment: { $first: "$reviewsAssessment" },
          zerothReviewComment: { $first: "$zerothReviewComment" }, // Added to the project level
          teacherName: { $first: "$teacherName" }, // Added to the project level
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id",
          projectMembers: 1,
          Assessment1: 1,
          Assessment2: 1,
          Assessment3: 1,
          Total: 1,
          viva_total_awarded: 1,
          groupRegisterNumbers: 1,
          reviewsAssessment: 1,
          zerothReviewComment: 1, // Projecting the comment
          teacherName: 1, // Projecting the teacher's name
        }
      }
    ]);
    res.json(projects);
  } catch (error) {
    console.error(`Error fetching UG projects for program ${programName}:`, error);
    res.status(500).json({ error: "Failed to fetch UG projects" });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));