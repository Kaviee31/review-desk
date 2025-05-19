import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Schemas
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
});

const messageSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // expires in 24 hrs
});

// Models
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
const Message = mongoose.model("Message", messageSchema);

//
// === ROUTES ===
//

// 👉 Enroll a student
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

// 👉 Get courses enrolled by a student
app.get("/student-courses/:registerNumber", async (req, res) => {
  try {
    const courses = await Enrollment.find({ registerNumber: req.params.registerNumber });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Error fetching student courses" });
  }
});

// 👉 Get all unique students
app.get("/all-students", async (req, res) => {
  try {
    const students = await Enrollment.aggregate([
      { $group: { _id: "$registerNumber", studentName: { $first: "$studentName" } } },
      {
        $project: {
          _id: 0,
          registerNumber: "$_id",
          studentName: 1,
          email: { $concat: ["$_id", "@student.annauniv.edu"] }
        }
      }
    ]);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// 👉 Get all students for a teacher's course
app.get("/teacher-courses/:teacherEmail", async (req, res) => {
  try {
    const students = await Enrollment.find({ teacherEmail: req.params.teacherEmail });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch teacher's students" });
  }
});

// 👉 Update marks (Assessment 1–3 and Total)
app.post("/update-marks", async (req, res) => {
  try {
    const { students } = req.body;
    for (const student of students) {
      await Enrollment.findOneAndUpdate(
        { registerNumber: student.registerNumber, courseName: student.courseName },
        {
          $set: {
            Assessment1: student.Assessment1,
            Assessment2: student.Assessment2,
            Assessment3: student.Assessment3,
            Total: student.Total,
          }
        },
        { new: true, upsert: true }
      );
    }
    res.json({ message: "Marks updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update marks" });
  }
});

// 👉 Post a chat message
app.post("/post-message", async (req, res) => {
  const { content } = req.body;
  try {
    const newMessage = new Message({ content });
    await newMessage.save();
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// 👉 Get all chat messages
app.get("/all-messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
