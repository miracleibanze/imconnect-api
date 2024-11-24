const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { default: mongoose } = require("mongoose");

// const getAllUsers = asyncHandler(async (req, res) => {
//   const excludedUsername = req.params.username;

//   const currentUser = await User.findOne({ username: excludedUsername }).lean();

//   if (!currentUser) {
//     return res.status(404).json({ message: "Current user not found" });
//   }

//   const users = await User.find({ username: { $ne: excludedUsername } })
//     .select("image names username friends")
//     .sort({ createdAt: -1 })
//     .lean();

//   if (!users || !users.length) {
//     return res.json({ message: "No users found" });
//   }

//   const friends = [];
//   const nonFriends = [];

//   users.forEach((user) => {
//     if (currentUser.friends.includes(user._id.toString())) {
//       friends.push(user);
//     } else {
//       nonFriends.push(user);
//     }
//   });

//   res.json({
//     friends,
//     nonFriends,
//   });
// });

const getOneUser = asyncHandler(async (req, res) => {
  const username = req.params.username;
  console.log(username);
  const user = await User.findOne({ username }).select("-password").lean();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const initialPosts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .lean();

  const posts = initialPosts.map((post) => ({
    ...post,
    person: user.names || "Unknown User",
    avatar: user.image || null,
    user: undefined,
  }));

  res.json({ user, posts });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { currentUser } = req.query;

  if (!currentUser) {
    return res.status(400).json({ message: "Current user is required." });
  }

  const user = await User.findById(currentUser).lean();
  if (!user) {
    return res.status(404).json({ message: "Current user not found." });
  }

  const users = await User.find({ _id: { $ne: currentUser } })
    .select("username names image")
    .lean();

  if (!users.length) {
    return res.status(404).json({ message: "No users found." });
  }

  const formattedUsers = users.map((otherUser) => ({
    ...otherUser,
    isFriend: user.friends.includes(otherUser._id.toString()),
  }));

  res.status(200).json({ users: formattedUsers });
});

const createNewUser = asyncHandler(async (req, res) => {
  const { username, names, email, password, dob, gender } = req.body;

  if (!username || !names || !email || !password || !dob || !gender) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const duplicate = await User.findOne({ email }).lean();
  if (duplicate) {
    return res.status(409).json({ message: "Email is already registered." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    names,
    email,
    password: hashedPassword,
    dob,
    gender,
  });

  const savedUser = await newUser.save();
  res
    .status(201)
    .json({ message: "User created successfully.", user: savedUser });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (updates.email) {
    const duplicate = await User.findOne({ email: updates.email }).lean();
    if (duplicate && duplicate._id.toString() !== id) {
      return res.status(409).json({ message: "Email is already in use." });
    }
  }

  Object.assign(user, updates);
  const updatedUser = await user.save();

  res
    .status(200)
    .json({ message: "User updated successfully.", user: updatedUser });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findById(id).lean();
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const posts = await Post.find({ user: id }).lean();
  if (posts.length > 0) {
    return res
      .status(400)
      .json({ message: "User cannot be deleted with existing posts." });
  }

  await User.findByIdAndDelete(id);
  res.status(200).json({ message: "User deleted successfully." });
});

const getMyFiends = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await User.findById(userId);
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
        },
      },
      {
        $sort: { names: 1 },
      },
    ]);

    let friendsIds = [];
    chatParticipants.map(async (friend, index) => {
      friendsIds = [...friendsIds, friend.userId];
      currentUser.friends = friendsIds;
    });
    await currentUser.save();
    res.send(chatParticipants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch chat participants" });
  }
});

const sendRequest = asyncHandler(async (req, res) => {
  const { recipientId } = req.params;
  const { senderId } = req.body; // Assuming sender's ID is in the request body

  try {
    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.json({ message: "User not found" });
    }

    // Check if already friends or request already sent
    if (
      recipient.friends.includes(senderId) ||
      recipient.friendRequests.includes(senderId)
    ) {
      return res
        .status(400)
        .json({ message: "Friend request already sent or already friends" });
    }

    recipient.friendRequests.push(senderId);
    await recipient.save();

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

const requestRespond = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const { recipientId, action } = req.body; // Assuming action is "accept" or "decline"

  try {
    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if sender is in recipient's friend requests
    const requestIndex = recipient.friendRequests.indexOf(senderId);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No friend request found" });
    }

    if (action === "accept") {
      // Add each other to friends list
      recipient.friends.push(senderId);
      sender.friends.push(recipientId);
    }

    // Remove sender from friend requests
    recipient.friendRequests.splice(requestIndex, 1);
    await recipient.save();
    await sender.save();

    res
      .status(200)
      .json({ message: `Friend request ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
  getOneUser,
  getMyFiends,
  requestRespond,
  sendRequest,
};
