import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (text === "/start") {
    bot.sendMessage(chatId, "👋 Hi! Please reply with your register number to link your Telegram account.");
  } else if (/^\d{10}$/.test(text)) {
    try {
      await axios.post(`${process.env.API_BASE_URL || "http://localhost:5000"}/api/save-telegram-id`, {
        registerNumber: text,
        chatId,
      });
      bot.sendMessage(chatId, "✅ Your Telegram is now linked! You'll receive updates here.");
    } catch (err) {
      console.error("Failed to link Telegram ID:", err);
      bot.sendMessage(chatId, "❌ Failed to link. Please try again later.");
    }
  } else {
    bot.sendMessage(chatId, "❗ Please send a valid 10-digit register number (e.g., 2024178053).");
  }
});

export default bot;
