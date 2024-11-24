const express = require("express");
const router = express.Router();
const {
  getAllPosts,
  createNewPost,
  updatePost,
  deletePost,
  handleLike,
} = require("../controllers/postsControllers");

router.get("/", getAllPosts);
router.post("/", createNewPost);
router.put("/", updatePost);
router.delete("/", deletePost);
router.post("/like/:postId", handleLike);

module.exports = router;
