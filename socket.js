const socketIO = require("socket.io");
const { socketCors } = require("./config/cors");

let io = null; // Socket.io instance
let users = {}; // Map userId to socketId(s)

function initialize(server) {
  if (!io) {
    io = socketIO(server, socketCors);
    io.on("connection", (socket) => {
      const userId = socket.handshake.query.myId;
      console.log(`Socket connected: ${socket.id}`);

      if (userId) {
        if (!users[userId]) {
          users[userId] = [];
        }
        users[userId].push(socket.id);
        console.log(`User registered: ${userId}, Sockets: ${users[userId]}`);
      }

      // Print all connected userIds
      console.log("Current connected users:", Object.keys(users));

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        for (const userId in users) {
          users[userId] = users[userId].filter((id) => id !== socket.id);
          if (users[userId].length === 0) {
            delete users[userId]; // Remove user if no active sockets remain
          }
        }
        console.log("Current connected users:", Object.keys(users));
      });

      // Handle sending messages
      socket.on("sendMessage", (messageData) => {
        const { senderId, receiverId, message } = messageData;
        const receiverSocketIds = users[receiverId];
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("newMessage", {
              senderId,
              receiverId,
              message,
            });
          });
        } else {
          console.log(`Receiver ${receiverId} is not connected.`);
        }
      });

      socket.onAny((event, ...args) => {
        console.log(`Event received: ${event}`, args);
      });
    });

    console.log("Socket.io initialized successfully.");
  }

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io is not initialized.");
  }
  return io;
}

module.exports = { initialize, getIO, users };
