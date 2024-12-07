const socketIO = require("socket.io");
const { socketCors } = require("./config/cors");

let io = null; // Socket.io instance
let users = {}; // Map userId to an array of socket IDs

function initialize(server) {
  if (io) {
    console.log("Socket.io already initialized.");
    return io;
  }

  console.log("Initializing socket...");
  io = socketIO(server, socketCors);

  io.on("connection", (socket) => {
    // console.log(`Socket connected: ${socket.id}`);

    // Handle user connection
    socket.on("userConnected", (userId) => {
      if (!userId) {
        console.log("Invalid userId received.");
        return;
      }

      // console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
      // console.log("Users before update:", JSON.stringify(users, null, 2));

      if (!users[userId]) {
        users[userId] = [];
      }
      if (!users[userId].includes(socket.id)) {
        users[userId].push(socket.id);
      }

      // console.log("Updated users:", JSON.stringify(users, null, 2));
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      Object.keys(users).forEach((userId) => {
        users[userId] = users[userId].filter((id) => id !== socket.id);

        // Remove user entry if no sockets are associated
        if (users[userId].length === 0) {
          delete users[userId];
        }
      });

      // console.log(
      //   "Updated users after disconnection:",
      //   JSON.stringify(users, null, 2)
      // );
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io is not initialized.");
  }
  return io;
}

module.exports = { initialize, getIO, users };
