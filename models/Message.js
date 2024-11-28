const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    message: { type: String, required: true },
    image: {
      type: Boolean,
      default: false,
    },
    timestamp: { type: Date, default: Date.now },
    readBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [], // Default to an empty array
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
