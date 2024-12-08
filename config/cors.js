const corsOptions = {
  origin: [
    "https://imconnect.netlify.app",
    "https://imconnect.vercel.app",
    "http://localhost:5174",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const socketCors = {
  cors: {
    origin: [
      "https://imconnect.netlify.app",
      "https://imconnect.vercel.app",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
};

module.exports = { corsOptions, socketCors };
