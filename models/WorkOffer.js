const mongoose = require("mongoose");

const workSchema = new mongoose.Schema(
  {
    names: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Work", workSchema);
