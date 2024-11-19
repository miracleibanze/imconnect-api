const asyncHandler = require("express-async-handler");
const Post = require("../models/Post");
const User = require("../models/User");
const getAllPosts = asyncHandler(async (req, res) => {
  try {
    const posts = await Post.find()
      .populate({
        path: "user",
        select: "username names image",
      })
      .sort({ createdAt: -1 })
      .lean();

    const transformedPosts = posts.map((post) => ({
      ...post,
      person: post.user?.names || "Unknown User",
      username: post.user?.username || "username",
      avatar: post.user?.image || null,
      user: undefined,
    }));

    res.status(200).json({ success: true, posts: transformedPosts });
  } catch (error) {
    console.error("Error retrieving posts:", error);

    res.status(500).json({ success: false, error: "Error retrieving posts" });
  }
});

const createNewPost = asyncHandler(async (req, res) => {
  const { user, description } = req.body;

  if (!user) {
    return res.status(400).json({
      message: "User required",
    });
  }
  if (!description) {
    return res.status(400).json({
      message: "Please write something !",
    });
  }
  const person = User.find({ _id: user }).lean().exec();

  if (!person) return res.status(400).send({ message: "no user found" });

  console.log(req.body);
  const postObject = req.body;

  const post = await Post.create(postObject);

  if (post) {
    return res.status(201).send({ message: "new post created" });
  } else {
    return res.status(400).send({ message: "Invalid post data received" });
  }
});

const updatePost = asyncHandler(async (req, res) => {
  const { id, user, description, feeling, time, images } = req.body;

  if (!id || !user || !description || !feeling || !images) {
    return res.status(400).json({ message: "All fields required" });
  }

  const post = await Post.findById(id).exec();

  if (!post) return res.status(400).json({ message: "Post not found" });

  post.user = user;
  post.feeling = feeling;
  post.description = description;
  post.feeling = feeling;
  post.time = time;
  post.images = images;

  const updatedPost = await post.save();

  res.json({ message: `your post was updated` });
});

const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Post ID required" });
  }

  const myPost = await Post.findOne({ post: id }).lean().exec();

  if (post?.lenght) {
    return res.status(400).json({ message: "post have assigned posts" });
  }

  const post = await Post.findById(id).exec();

  if (!post) {
    return res.status(400).json({ message: "Post not found" });
  }

  const result = await post.deleteOne();
  console.log(result);

  if (!result)
    return res.status(404).send({ message: "unable to delete post" });
  const reply = `Postname ${post.postname} with ID ${post._id} deleted`;

  res.json(reply);
});

const handleLike = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);

    if (post.likedBy.includes(userId)) {
      return res.send({ message: "You have already liked this post" });
    }

    post.likes += 1;
    post.likedBy.push(userId);

    await post.save();

    res
      .status(200)
      .json({ message: "Post liked successfully", likes: post.likes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = {
  getAllPosts,
  createNewPost,
  updatePost,
  deletePost,
  handleLike,
};
