const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { default: mongoose } = require("mongoose");

const getAllUsers = asyncHandler(async (req, res) => {
  const excludedUsername = req.params.username;

  const currentUser = await User.findOne({ username: excludedUsername }).lean();

  if (!currentUser) {
    return res.status(404).json({ message: "Current user not found" });
  }

  const users = await User.find({ username: { $ne: excludedUsername } })
    .select("image names username friends")
    .sort({ createdAt: -1 })
    .lean();

  if (!users || !users.length) {
    return res.status(400).json({ message: "No users found" });
  }

  const friends = [];
  const nonFriends = [];

  users.forEach((user) => {
    if (currentUser.friends.includes(user._id.toString())) {
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

const createNewUser = asyncHandler(async (req, res) => {
  const { names, username, password, email, dob, gender } = req.body;

  if (!names || !username || !password || !email || !dob || !gender) {
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

  const user = await User.create(userObject);

  if (user) {
    req.session.user = user;
    return res.status(201).json(req.session.user);
  } else {
    return res.status(400).json({ message: "Invalid user data received" });
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

  if (!id) return res.status(400).json({ message: "id" });

  const user = await User.findById(id).exec();

  if (!user) return res.status(400).json({ message: "User not found" });

  if (names) {
    user.names = names;
    await user.save();
    return res.status(200).send("names updated");
  }
  if (username) {
    const duplicate = await User.findOne({ username }).lean().exec();

    if (duplicate && duplicate?._id.toString() !== id) {
      return res.status(409).json({ message: "username already taken" });
    }
    user.username = username;
    await user.save();
    return res.status(200).send("username updated");
  }
  if (email) {
    user.email = email;
    await user.save();
    return res.status(200).send("email updated");
  }
  if (location) {
    user.location = location;
    await user.save();
    return res.status(200).send("location updated");
  }
  if (dob) {
    user.dob = dob;
    await user.save();
    return res.status(200).send("dob updated");
  }
  if (gender) {
    user.gender = gender;
    await user.save();
    return res.status(200).send("gender updated");
  }
  if (image) {
    user.image = image;
    await user.save();
    return res.status(200).send("profile image updated");
  }
  if (cover) {
    user.cover = cover;
    await user.save();
    return res.status(200).send("cover image updated");
  }
  if (password) {
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    return res.status(200).send("password updated");
  }
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
  console.log(result);

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

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
  getOneUser,
  getMyFiends,
};
