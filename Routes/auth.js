const { Router } = require("express");
const User = require("../models/User");
const bcrypt = require("bcrypt");

const authRouter = Router();

authRouter.post("/auth", async (req, res) => {
  const {
    body: { email, username, password },
  } = req;

  if (!email) return res.status(400).send({ message: "Email required" });
  let findUser;
  if (email) {
    findUser = await User.findOne({ email: email }).lean().exec();
  }

  if (!findUser) {
    return res.status(404).send({ message: "email" });
  }
  const isMatch = await bcrypt.compare(password, findUser.password);
  if (!isMatch) {
    return res.status(401).send({ message: "password" });
  }

  req.session.user = findUser;
  return res.status(200).send(req.session);
});

authRouter.get("/auth/status", (req, res) => {
  return req.session.user
    ? res.status(200).send(req.session.user)
    : res.status(401).send({
        msg: `bad credentials, no user logged in: ${req.session.user}`,
      });
});

authRouter.get("/auth/:email", async (req, res) => {
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
});

authRouter.post("/auth/logout", (req, res) => {
  if (!req.session) return res.sendStatus(401);
  req.logout((err) => {
    if (err) return res.sendStatus(401);
    res.sendStatus(200);
  });
});
module.exports = authRouter;
