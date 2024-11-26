const express = require("express");
const router = express.Router();
const {
  getAllPosts,
  createNewPost,
  updatePost,
  deletePost,
  handleLike,
  getPostsByUserId,
} = require("../controllers/postsControllers");

router.get("/posts", getAllPosts);
router.post("/posts", createNewPost);
router.put("/posts", updatePost);
router.delete("/posts", deletePost);
router.post("/posts/like/:postId", handleLike);
router.get("/posts/likes/:id", getPostsByUserId);

module.exports = router;
