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

users.post("/users", createNewUser);
users.put("/users", updateUser);
users.delete("/users", deleteUser);

users.get("/users/:username", getAllUsers);
users.get("/users/one/:username", getOneUser);
users.get("/users/friends/:userId", getMyFiends);

users.post("/users/send-friend-request/:recipientId", sendRequest);

users.post("/users/respond-friend-request/:senderId", requestRespond);

module.exports = users;
