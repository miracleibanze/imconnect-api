const corsOptions = {
  origin: [
    "https://imconnect.netlify.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const socketCors = {
  cors: {
    origin: [
      "https://imconnect.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000, // Interval between pings
  pingTimeout: 60000, // Timeout before disconnecting
  transports: ["websocket"], // Use WebSocket only
};

module.exports = { corsOptions, socketCors };
