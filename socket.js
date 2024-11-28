let io; // Variable to store the Socket.io instance

function initialize(server) {
  if (!io) {
    const socketIO = require("socket.io");
    io = socketIO(server, {
      cors: {
        origin: "*", // Replace "*" with specific frontend URL in production
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle joining a room
      socket.on("joinRoom", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room: ${userId}`);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });

    console.log("Socket.io initialized successfully.");
  } else {
    console.log("Socket.io is already initialized.");
  }

  return io;
}

function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io not initialized! Call initialize(server) first."
    );
  }
  return io;
}

module.exports = { initialize, getIO };
