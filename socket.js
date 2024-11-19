let io;

function initialize(server) {
  if (!io) {
    const socketIO = require("socket.io");
    io = socketIO(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on("joinRoom", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room: ${userId}`);
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
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
