const asyncHandler = require("express-async-handler");
const express = require("express");
const searchQuery = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");

searchQuery.get("/latest-posts", async (req, res) => {
  try {
    const initialPosts = await Post.find()
      .populate("user", "names image username")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const posts = initialPosts.map((post) => ({
      ...post,
      person: post.user?.names || "Unknown User",
      username: post.user?.username || "username",
      avatar: post.user?.image || null,
      user: undefined,
    }));

    res.send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching posts" });
  }
});

searchQuery.get("/latest-users/:username", async (req, res) => {
  const excludedUsername = req.params.username;
  try {
    const users = await User.find({ username: { $ne: excludedUsername } })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

searchQuery.get(
  "/search",
  asyncHandler(async (req, res) => {
    try {
      const { text, name } = req.query;
      const nameRegex = new RegExp(name, "i");
      const searchRegex = new RegExp(text, "i");

      let users = [];
      if (name) {
        users = await User.find({
          names: { $regex: nameRegex },
        })
          .select("image names username email")
          .sort({ createdAt: -1 })
          .lean();
      }

      let posts = [];
      if (text) {
        const initialposts = await Post.find({
          description: { $regex: searchRegex },
        })
          .populate("user", "names image")
          .sort({ createdAt: -1 })
          .lean();

        posts = initialposts.map((post) => ({
          ...post,
          person: post.user?.names || "Unknown User",
          avatar: post.user?.image || null,
          user: undefined,
        }));
      }

      if (text && !name) return res.status(200).json({ posts });
      if (!text && name) return res.status(200).json({ users });
      return res.status(200).json({ users, posts });
    } catch (error) {
      res.status(500).json({ error: "Error searching data" });
    }
  })
);

searchQuery.post(
  "/search",
  asyncHandler(async (req, res) => {
    try {
      const { search, name } = req.body;
      const nameRegex = new RegExp(name, "i");
      const searchRegex = new RegExp(search, "i");

      let users = [];
      if (name) {
        users = await User.find({
          names: { $regex: nameRegex },
        })
          .select("image names username email")
          .sort({ createdAt: -1 })
          .lean();
      }

      let posts = [];
      if (search) {
        const initialposts = await Post.find({
          description: { $regex: searchRegex },
        })
          .populate("user", "names image")
          .sort({ createdAt: -1 })
          .lean();

        posts = initialposts.map((post) => ({
          ...post,
          person: post.user?.names || "Unknown User",
          avatar: post.user?.image || null,
          user: undefined,
        }));
      }

      if (search && !name) return res.status(200).json({ posts });
      if (!search && name) return res.status(200).json({ users });
      return res.status(200).json({ users, posts });
    } catch (error) {
      console.error("Error retrieving posts:", error);
      res.status(500).json({ error: "Error retrieving posts" });
    }
  })
);

module.exports = searchQuery;
