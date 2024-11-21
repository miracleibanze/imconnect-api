const { Router } = require("express");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const authRouter = Router();

authRouter.post(
  "/auth",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ message: "Email required" });

    const findUser = await User.findOne({ email }).lean().exec();
    if (!findUser) {
      return res
        .status(404)
        .send({ message: "user with that email not found" });
    }
    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      return res.status(401).send({ message: "incorrect password" });
    }
    console.log(`successfully logged in as ${findUser.names}`);
    return res.status(200).send(findUser);
  })
);

authRouter.get(
  "/auth/:email",
  asyncHandler(async (req, res) => {
    const { email } = req.params;

    try {
      const user = await User.findOne({ email }).lean().exec();

      if (user) {
        return res.status(200).send(user);
      } else {
        return res.status(404).send(null);
      }
    } catch (error) {
      console.error("Error verifying user:", error);
      return res.status(500).send(null);
    }
  })
);

module.exports = authRouter;
