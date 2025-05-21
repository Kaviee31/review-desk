import mongoose from "mongoose";

const chatUserSchema = new mongoose.Schema({
  registerNumber: { type: String, required: true, unique: true },
  chatId: { type: String, required: true },
});

const ChatUser = mongoose.model("ChatUser", chatUserSchema);
export default ChatUser;
