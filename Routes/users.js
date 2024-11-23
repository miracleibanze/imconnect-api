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

users
  .route("/users")
  .get((req, res) => {
    res.send({ message: "this is users route" });
  })
  .post(createNewUser)
  .patch(updateUser)
  .delete(deleteUser);

users.route("/users/:username").get(getAllUsers);
users.route("/users/one/:username").get(getOneUser);
users.route("/users/friends/:userId").get(getMyFiends);

users.post("/users/send-friend-request/:recipientId", sendRequest);

users.post("/users/respond-friend-request/:senderId", requestRespond);

module.exports = users;
