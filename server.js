require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User"); // Assuming the model exists in the correct location
const http = require("http");
const { Server } = require("socket.io");

const { corsOptions } = require("./config/cors"); // Assuming corsOptions are correctly defined
const { initialize } = require("./socket"); // Assuming this handles socket initialization

const app = express();
const PORT = process.env.PORT || 3000; // Port from environment variables or default to 3000

// MongoDB Connection (with URL from environment variable)
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process if MongoDB fails to connect
  });

// Middleware Setup
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cors(corsOptions)); // CORS middleware for handling cross-origin requests

// API Routes
app.get("/", async (req, res) => {
  // Update User model if needed, e.g., add default date to users who don't have it
  await User.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: new Date("01/01/2025") } }
  );

  res.status(200).send({ message: "Welcome to IMConnect API" });
});
app.use("/", require("./Routes/routes")); // Route middleware for other endpoints

// Initialize the Socket.io server
const server = http.createServer(app);
initialize(server); // Assuming this initializes your WebSocket connection

// Start the server (this should work on both local and Vercel environments)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
