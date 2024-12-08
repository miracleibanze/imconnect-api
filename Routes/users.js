const {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
  getOneUser,
  getMyFriends,
  requestRespond,
  sendRequest,
  currentRequests,
} = require("../controllers/usersControllers");

const users = require("express").Router();

users.post("/users", createNewUser);
users.put("/users", updateUser);
users.delete("/users", deleteUser);

users.get("/users/:username", getAllUsers);
users.get("/users/one/:username", getOneUser);
users.get("/users/friends/:userId", getMyFriends);

users.post("/users/send-friend-request/:recipientId", sendRequest);

users.post("/users/respond-friend-request/:senderId", requestRespond);
users.get("/users/confirm-request/:userId", currentRequests);

module.exports = users;
