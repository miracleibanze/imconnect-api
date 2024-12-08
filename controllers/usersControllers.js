const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { default: mongoose } = require("mongoose");

const getAllUsers = async (req, res) => {
  try {
    const excludedUsername = req.params.username;
    const currentUser = await User.findOne({
      username: excludedUsername,
    }).lean();

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    // Ensure that currentUser.friends is an array, defaulting to an empty array if undefined
    const friendsList = Array.isArray(currentUser.friends)
      ? currentUser.friends
      : [];

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
      // Check if the current user is friends with the other user
      const isFriend = friendsList.some((friendId) =>
        new mongoose.Types.ObjectId(friendId).equals(user._id)
      );

      // Add requestSent flag if the current user has sent a request to this user
      const requestSent =
        currentUser.sentRequests &&
        currentUser.sentRequests.some((request) =>
          new mongoose.Types.ObjectId(request).equals(user._id)
        );

      const userWithRequestStatus = {
        ...user,
        requestSent, // add the requestSent field
      };

      if (isFriend) {
        friends.push(userWithRequestStatus);
      } else {
        nonFriends.push(userWithRequestStatus);
      }
    });

    res.json({
      friends,
      nonFriends,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
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
