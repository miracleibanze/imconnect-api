const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    names: { type: String, required: true },
    username: { type: String, required: true },
    about: String,
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    image: String,
    cover: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
