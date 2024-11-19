const expressAsyncHandler = require("express-async-handler");
const {
  getAllPosts,
  createNewPost,
  updatePost,
  deletePost,
  searchPosts,
  handleLike,
} = require("../controllers/postsControllers");
const Post = require("../models/Post");
const User = require("../models/User");

const posts = require("express").Router();

posts
  .route("/posts")
  .get(getAllPosts)
  .post(createNewPost)
  .patch(updatePost)
  .delete(deletePost);
posts.post("/posts/like/:postId", handleLike);
module.exports = posts;
