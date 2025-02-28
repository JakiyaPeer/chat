import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./Database/dbconfig.js";

dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // React frontend
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Message Schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", MessageSchema);

// Socket.io connection
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  try {
    // Send all previous messages to new user
    const messages = await Message.find().sort({ timestamp: 1 });
    socket.emit("previous-messages", messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
  }

  // Receive and broadcast new messages
  socket.on("send-message", async (data) => {
    try {
      const newMessage = new Message(data);
      await newMessage.save();
      io.emit("receive-message", data);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// API route to store messages
app.post("/messages", async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
