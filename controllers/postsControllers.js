const asyncHandler = require("express-async-handler");
const Post = require("../models/Post");
const User = require("../models/User");
const { default: mongoose } = require("mongoose");

const getAllPosts = asyncHandler(async (req, res) => {
  try {
    const posts = await Post.find()
      .populate({
        path: "user",
        select: "username names image",
      })
      .sort({ createdAt: -1 })
      .lean();

    const transformedPosts = posts.map((post) => {
      const { user, ...rest } = post;
      return {
        ...rest,
        person: user?.names || "Unknown User",
        username: user?.username || "Unknown",
        avatar: user?.image || null,
      };
    });

    res.status(200).json({ success: true, posts: transformedPosts });
  } catch (error) {
    console.error("Error retrieving posts:", error);
    res.status(500).json({ success: false, error: "Error retrieving posts." });
  }
});
const getPostsByUserId = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID." });
    }

    const posts = await Post.find({ user: userId })
      .populate({
        path: "user",
        select: "username names image",
      })
      .sort({ createdAt: -1 }) // Sort by latest posts first
      .lean();

    if (!posts || posts.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found!" });
    }

    // Transform the posts data to match the desired structure
    const transformedPosts = posts.map((post) => {
      const { user, ...rest } = post;
      return {
        ...rest,
        person: user?.names || "Unknown User",
        username: user?.username || "Unknown",
        avatar: user?.image || null,
      };
    });

    res.status(200).json({ success: true, posts: transformedPosts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while fetching posts.",
      });
  }
});

const createNewPost = asyncHandler(async (req, res) => {
  const { user, description } = req.body;

  if (!user || !description) {
    return res
      .status(400)
      .json({ message: "User and description are required." });
  }

  const userExists = await User.findById(user).lean();
  if (!userExists) {
    return res.status(404).json({ message: "User not found." });
  }

  const post = await Post.create({ user, description });

  res.status(201).json({ message: "Post created successfully.", post });
});

const updatePost = asyncHandler(async (req, res) => {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Post ID is required." });
  }

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  Object.assign(post, updates);
  const updatedPost = await post.save();

  res
    .status(200)
    .json({ message: "Post updated successfully.", post: updatedPost });
});

const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Post ID is required." });
  }

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  await post.deleteOne();
  res.status(200).json({ message: "Post deleted successfully." });
});

const handleLike = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  if (!userId || !postId) {
    return res
      .status(400)
      .json({ message: "User ID and Post ID are required." });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  if (post.likedBy.includes(userId)) {
    return res.status(400).json({ message: "Post already liked." });
  }

  post.likes += 1;
  post.likedBy.push(userId);
  await post.save();

  res
    .status(200)
    .json({ message: "Post liked successfully.", likes: post.likes });
});

module.exports = {
  getAllPosts,
  createNewPost,
  updatePost,
  deletePost,
  handleLike,
  getPostsByUserId,
};
