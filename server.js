require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
const mongoose = require("mongoose");
const Redis = require("redis");
const connectRedis = require("connect-redis");
const User = require("./models/User");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const { corsOptions, socketCors } = require("./config/cors");
const { getAllMessages } = require("./controllers/messageControllers");
const { initialize } = require("./socket");

// Set up MongoDB connection
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Set up Redis client
const RedisStore = connectRedis(session);
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST, // You will need to set up a Redis server (use Redis Cloud or your own instance)
  port: process.env.REDIS_PORT,
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Enable CORS
app.use(cors(corsOptions));

// Use Redis for session storage
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: "miraclecode11",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 100000 * 60 * 60 },
  })
);

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.get("/", async (req, res) => {
  await User.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: new Date("01/01/2025") } }
  );

  res
    .status(200)
    .send({ message: `this is IMConnect rest api ${100000 * 60 * 60} ` });
});

app.use("/", require("./Routes/routes"));

// Initialize socket.io
const server = http.createServer(app);
initialize(server);

// Bind the server to listen on the environment's port or default to 5000
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Socket running on port 5000`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
