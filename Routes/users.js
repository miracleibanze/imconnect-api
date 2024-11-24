const {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
  getOneUser,
  getMyFiends,
  requestRespond,
  sendRequest,
} = require("../controllers/usersControllers");

const users = require("express").Router();

users.get("/", getAllUsers);
users.post("/", createNewUser);
users.put("/", updateUser);
users.delete("/", deleteUser);

users.route("/users/:username").get(getAllUsers);
users.route("/users/one/:username").get(getOneUser);
users.route("/users/friends/:userId").get(getMyFiends);

users.post("/users/send-friend-request/:recipientId", sendRequest);

users.post("/users/respond-friend-request/:senderId", requestRespond);

module.exports = users;
