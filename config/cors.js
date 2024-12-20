const corsOptions = {
  origin: [
    "https://imconnect.netlify.app",
    "https://imconnect.vercel.app",
    "https://ibanze-miracle.vercel.app",
    "http://localhost:5173",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const socketCors = {
  cors: {
    origin: [
      "https://imconnect.netlify.app",
      "https://imconnect.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
};

module.exports = { corsOptions, socketCors };
