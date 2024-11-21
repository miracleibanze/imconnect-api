const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getIO } = require("../socket");

const createNewMessage = asyncHandler(async (req, res) => {
  const { senderId, receiverId, message, image } = req.body;

  const newMessage = new Message({
    senderId,
    receiverId,
    message,
    image,
  });

  try {
    await newMessage.save();

    const io = getIO();
    io.to(receiverId).emit("newMessage", newMessage);

    res.status(200).json({ success: true, message: newMessage });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Error saving message" });
  }
});

const getAllMessages = asyncHandler(async (req, res) => {
  const { userId, otherUserId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    const user = await User.findById(otherUserId)
      .select("image names username email")
      .lean()
      .exec();
    return res.status(200).send({ messages, user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});
const markAsRead = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const result = await Message.updateMany(
      { chatId: chatId },
      { $addToSet: { readBy: userId } }
    );
    res.status(200).json({
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Error marking messages as read" });
  }
});

const myChatParticipants = asyncHandler(async (req, res) => {
  try {
    const username = req.params.username;

    const currentUser = await User.findOne({ username });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentUserId = new mongoose.Types.ObjectId(currentUser._id);

    const chatParticipants = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }],
        },
      },
      {
        $project: {
          userId: {
            $cond: {
              if: { $eq: ["$senderId", currentUserId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
          message: "$message",
          readBy: "$readBy",
          timestamp: "$timestamp",
        },
      },
      {
        $group: {
          _id: "$userId",
          lastMessageTime: { $max: "$timestamp" },
          lastMessage: { $first: "$message" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          names: "$userDetails.names",
          username: "$userDetails.username",
          email: "$userDetails.email",
          image: "$userDetails.image",
          lastMessageTime: 1,
          lastMessageSnippet: {
            $ifNull: [
              {
                $cond: {
                  if: { $lte: [{ $strLenCP: "$lastMessage" }, 40] },
                  then: "$lastMessage",
                  else: { $substr: ["$lastMessage", 0, 40] },
                },
              },
              "No message",
            ],
          },
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    res.send(chatParticipants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch chat participants" });
  }
});
const handleDeleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  console.log("Message ID to delete:", messageId);

  const message = await Message.findById(messageId).exec();

  if (!message) {
    return res
      .status(404)
      .json({ message: "Message not found", query: messageId });
  }

  try {
    await message.deleteOne();
    console.log("Deleted message:", message);

    const messages = await Message.find().lean().exec();
    const io = getIO();

    // Broadcast to all except the user who deleted
    io.emit("messageDeleted", { messageId });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Unable to delete message" });
  }
});

module.exports = {
  createNewMessage,
  getAllMessages,
  myChatParticipants,
  markAsRead,
  handleDeleteMessage,
};
