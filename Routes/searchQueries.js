const asyncHandler = require("express-async-handler");
const express = require("express");
const searchQuery = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");

searchQuery.get("/latest-posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;

  try {
    const totalPosts = await Post.countDocuments();
    const initialPosts = await Post.find()
      .populate("user", "names image username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const hasMore = skip + limit < totalPosts;

    const posts = initialPosts.map((post) => ({
      ...post,
      person: post.user?.names || "Unknown User",
      username: post.user?.username || "username",
      avatar: post.user?.image || null,
      user: undefined,
    }));

    res.send({ posts, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching posts" });
  }
});

searchQuery.get("/latest-users/:username", async (req, res) => {
  const excludedUsername = req.params.username;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;

  try {
    const totalUsers = await User.countDocuments({
      username: { $ne: excludedUsername },
    });

    const users = await User.find({ username: { $ne: excludedUsername } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const hasMore = skip + limit < totalUsers;

    res.json({ users, hasMore });
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

searchQuery.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { text, name, page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    // Validate `page` and `limit`
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ error: "Invalid limit number" });
    }

    const skip = (parsedPage - 1) * parsedLimit;

    try {
      const nameRegex = name ? new RegExp(name, "i") : null;
      const searchRegex = text ? new RegExp(text, "i") : null;

      // Fetch users matching the `name` query
      let users = [];
      let totalUsers = 0;
      let hasMoreUsers = false;
      if (name) {
        totalUsers = await User.countDocuments({
          names: { $regex: nameRegex },
        });
        users = await User.find({ names: { $regex: nameRegex } })
          .skip(skip)
          .limit(parsedLimit)
          .sort({ createdAt: -1 })
          .lean();
        hasMoreUsers = skip + parsedLimit < totalUsers;
      }

      // Fetch posts matching the `text` query
      let posts = [];
      let totalPosts = 0;
      let hasMorePosts = false;
      if (text) {
        totalPosts = await Post.countDocuments({
          description: { $regex: searchRegex },
        });
        const initialposts = await Post.find({
          description: { $regex: searchRegex },
        })
          .populate("user", "names image")
          .skip(skip)
          .limit(parsedLimit)
          .sort({ createdAt: -1 })
          .lean();

        posts = initialposts.map((post) => ({
          ...post,
          person: post.user?.names || "Unknown User",
          avatar: post.user?.image || null,
          user: undefined,
        }));
        hasMorePosts = skip + parsedLimit < totalPosts;
      }

      return res.status(200).json({
        users,
        posts,
        meta: {
          totalUsers,
          totalPosts,
          hasMoreUsers,
          hasMorePosts,
          currentPage: parsedPage,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      console.error("Error in /search endpoint:", error);
      res.status(500).json({ error: "Error searching data" });
    }
  })
);

module.exports = searchQuery;
