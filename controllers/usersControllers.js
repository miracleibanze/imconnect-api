const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { default: mongoose } = require("mongoose");

const getAllUsers = asyncHandler(async (req, res) => {
  const excludedUsername = req.params.username;
  const currentUser = await User.findOne({
    username: excludedUsername,
  }).lean();

  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  const users = await User.find({ username: { $ne: excludedUsername } })
    .select("image names username friends")
    .sort({ createdAt: -1 })
    .lean();

  if (!users || !users.length) {
    return res.json({ message: "No users found" });
  }

  const friends = [];
  const nonFriends = [];

  users.forEach((user) => {
    if (currentUser.friends.some((friendId) => friendId.equals(user._id))) {
      friends.push(user);
    } else {
      nonFriends.push(user);
    }
  });

  res.json({
    friends,
    nonFriends,
  });
});

const getOneUser = asyncHandler(async (req, res) => {
  const username = req.params.username;
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
const createNewUser = asyncHandler(async (req, res) => {
  const { names, username, password, email, dob, gender } = req.body;

  if (!names || !username || !password || !email || !gender) {
    return res.status(400).json({
      message: "All fields required !",
    });
  }

  const duplicate = await User.findOne({ username }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate username" });
  }

  const userObject = req.body;

  userObject.password = await bcrypt.hash(password, 10);

  try {
    const user = await User.create(userObject);

    if (user) {
      return res.status(201).json(user);
    } else {
      return res.status(400).json({ message: "Invalid user data received" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
const updateUser = asyncHandler(async (req, res) => {
  const {
    id,
    names,
    username,
    image,
    cover,
    password,
    email,
    location,
    dob,
    gender,
  } = req.body;

  if (!id) return res.status(400).json({ message: "id is required" });

  const user = await User.findById(id).exec();

  if (!user) return res.status(404).json({ message: "User not found" });

  let updated = false;

  if (names) {
    user.names = names;
    updated = true;
  }

  if (username) {
    const duplicate = await User.findOne({ username }).lean().exec();
    if (duplicate && duplicate?._id.toString() !== id) {
      return res.status(409).json({ message: "Username already taken" });
    }
    user.username = username;
    updated = true;
  }

  if (email) {
    user.email = email;
    updated = true;
  }

  if (location) {
    user.location = location;
    updated = true;
  }

  if (dob) {
    user.dob = dob;
    updated = true;
  }

  if (gender) {
    user.gender = gender;
    updated = true;
  }

  if (image) {
    user.image = image;
    updated = true;
  }

  if (cover) {
    user.cover = cover;
    updated = true;
  }

  if (password) {
    user.password = await bcrypt.hash(password, 10);
    updated = true;
  }

  if (updated) {
    await user.save();
    return res.status(200).json({ message: "User updated successfully", user });
  }

  return res.status(400).json({ message: "No fields to update" });
});
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const posts = await Post.find({ user: id }).lean().exec();
  if (posts.length > 0) {
    await Post.deleteMany({ user: id }).exec();
  }

  const messages = await Message.find({
    $or: [{ senderId: id }, { receiverId: id }],
  })
    .lean()
    .exec();

  if (messages.length > 0) {
    await Message.deleteMany({
      $or: [{ senderId: id }, { receiverId: id }],
    }).exec();
  }

  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const result = await user.deleteOne();

  const reply = {
    message: "Account and associated data (posts and messages) deleted.",
  };

  res.json(reply);
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
  const { recipientId } = req.params; // recipient ID from URL
  const { senderId } = req.body; // sender ID from the request body
  console.log({ receiver: recipientId });
  console.log({ sender: senderId });
  try {
    // Fetch both recipient and sender in parallel
    const [recipient, sender] = await Promise.all([
      User.findById(recipientId), // Find recipient by recipientId
      User.findById(senderId), // Find sender by senderId
    ]);

    // Check if both users exist
    if (!recipient || !sender) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if sender is already a friend or if a request has already been sent
    if (
      recipient.friends.includes(senderId) ||
      recipient.friendRequests.includes(senderId)
    ) {
      return res.json({
        message: "Friend request already sent or already friends",
      });
    }

    // Add sender's ID to the recipient's friendRequests array
    recipient.friendRequests.push(senderId);

    console.log(recipient.friendRequests);
    // Save the recipient with the updated friendRequests
    await recipient.save();

    // Respond to the client with a success message
    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

const currentRequests = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate(
      "friendRequests",
      "names username _id"
    );

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }
    console.log(user);
    return res.send(user.friendRequests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return res.status(400).send({ message: "Error fetching requests" });
  }
});

const requestRespond = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const { recipientId, action } = req.body;

  try {
    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    const requestIndex = recipient.friendRequests.indexOf(senderId);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No friend request found" });
    }

    if (action === "accept") {
      recipient.friends.push(senderId);
      sender.friends.push(recipientId);
    }

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
  currentRequests,
};
