const { Router } = require("express");
const {
  createNewMessage,
  myChatParticipants,
  markAsRead,
  getAllMessages,
  handleDeleteMessage,
} = require("../controllers/messageControllers");

const messageRoute = Router();
messageRoute.get("/messages/:userId/:otherUserId", getAllMessages);
messageRoute.route("/messages/send").post(createNewMessage);
messageRoute.route("/messages/:username").get(myChatParticipants);
messageRoute.post("/messages/markAsRead", markAsRead);
messageRoute.delete("/messages/delete/:messageId", handleDeleteMessage);

messageRoute.get("/messages/send", (req, res) => {
  getAllMessages(req, res, io);
});

module.exports = messageRoute;
