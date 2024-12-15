const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");

const mongoose = require("mongoose");
const getAllUsers = async (req, res) => {
  try {
    const excludedUsername = req.params.username;

    // Find the current user
    const currentUser = await User.findOne({ username: excludedUsername })
      .select("_id friends sentRequests friendRequests")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    const {
      _id: currentUserId,
      friends = [],
      friendRequests = [],
    } = currentUser;

    // Fetch all users except the current user
    const allUsers = await User.find({ username: { $ne: excludedUsername } })
      .select("image names username sentRequests friendRequests")
      .sort({ createdAt: -1 })
      .lean();

    if (!allUsers.length) {
      return res.json({ message: "No users found" });
    }

    // Create sets for efficient lookups
    const friendsSet = new Set(friends.map((id) => id.toString()));
    const friendRequestsSet = new Set(
      friendRequests.map((id) => id.toString())
    );

    // Categorize users
    const friendsList = [];
    const nonFriendsList = [];
    const friendRequestsList = [];

    allUsers.forEach((user) => {
      const userIdStr = user._id.toString();

      if (friendsSet.has(userIdStr)) {
        friendsList.push(user);
      } else if (friendRequestsSet.has(userIdStr)) {
        friendRequestsList.push(user);
      } else {
        nonFriendsList.push(user);
      }
    });

    // Return categorized lists
    res.json({
      friends: friendsList,
      friendRequests: friendRequestsList,
      nonFriends: nonFriendsList,
    });
  } catch (error) {
    console.error("Error fetching all users:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getOneUser = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const createNewUser = asyncHandler(async (req, res) => {
  const { names, username, password, email, dob, gender, image } = req.body;

  // Check if all required fields are provided
  if (!names || !username || !password || !email || !gender) {
    return res.status(400).json({
      message: "All fields are required!",
    });
  }

  try {
    // Check for duplicates in username, email, or names
    const duplicate = await User.findOne({
      $or: [{ username }, { email }, { names }],
    })
      .lean()
      .exec();

    if (duplicate) {
      let duplicateField = "";
      if (duplicate.username === username) duplicateField = "username";
      else if (duplicate.email === email) duplicateField = "email";
      else if (duplicate.names === names) duplicateField = "names";

      return res
        .status(409)
        .json({ message: `Duplicate ${duplicateField} found` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user object
    const userObject = {
      names,
      username,
      password: hashedPassword,
      email,
      dob,
      gender,
      image,
    };

    // Create the user
    const user = await User.create(userObject);

    if (user) {
      return res.status(201).json(user);
    } else {
      return res.status(400).json({ message: "Invalid user data received" });
    }
  } catch (error) {
    console.error("Error creating user:", error);
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

const getMyFriends = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the current user
    const currentUser = await User.findById(userId).select("friends");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Retrieve users whose IDs are in the `friends` array
    const friends = await User.find({ _id: { $in: currentUser.friends } })
      .select("names username email image")
      .sort({ names: 1 });

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Failed to fetch friends", error });
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
    // Fetch both users
    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    // Validate users
    if (!recipient || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the friend request exists
    const requestIndex = recipient.friendRequests.indexOf(senderId);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No friend request found" });
    }

    // Handle the action
    if (action === "accept") {
      // Add each user to the other's friend list
      if (!recipient.friends.includes(senderId)) {
        recipient.friends.push(senderId);
      }
      if (!sender.friends.includes(recipientId)) {
        sender.friends.push(recipientId);
      }
    } else if (action === "decline") {
      // If declining, just remove the friend request
      recipient.friendRequests.splice(requestIndex, 1);
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // Remove the friend request for the recipient
    recipient.friendRequests.splice(requestIndex, 1);

    // Save updates to both users
    await recipient.save();
    await sender.save();

    res
      .status(200)
      .json({ message: `Friend request ${action}ed successfully.` });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    res.status(500).json({ message: "Server error", error });
  }
});
module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
  getOneUser,
  getMyFriends,
  requestRespond,
  sendRequest,
  currentRequests,
};
