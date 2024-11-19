const corsOptions = {
  origin: ["http://localhost:5173", "http://imconnect.vercel.app"],
  credentials: true,
  optionsSuccessStatus: 200,
};

const socketCors = {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
};

module.exports = { corsOptions, socketCors };
