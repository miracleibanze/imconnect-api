require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { corsOptions } = require("./config/cors");
const { initialize } = require("./socket");

const app = express();
const PORT = process.env.PORT || 4000;

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 40000, // 40 seconds for initial connection
  socketTimeoutMS: 60000, // 60 seconds for socket operations
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URL, mongoOptions)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Middleware
app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ limit: "300mb", extended: true }));
app.use(cors(corsOptions));

// Routes
app.use("/", require("./Routes/routes"));
app.get("/", (req, res) => {
  res.status(200).send({
    Message:
      "This is IMConnect API built by IBANZE Miracle. Access the web app at: https://imconnect.netlify.app/",
  });
});

// Create an HTTP server and attach Socket.io
const server = http.createServer(app);
initialize(server); // Pass the server instance to initialize Socket.io

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
