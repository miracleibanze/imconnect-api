const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    feeling: String,
    description: {
      type: String,
      required: true,
    },
    images: [String],
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: String,
        content: String,
      },
    ],
    shares: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
