require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { initialize } = require("./socket");

const app = express();
const PORT = process.env.PORT || 4000;

// Create an HTTP server to handle both Express and Socket.io
const server = http.createServer(app);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Middleware
app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ limit: "300mb", extended: true }));
app.use(
  cors({
    origin: "*", // Replace "*" with your frontend URL in production
    methods: ["GET", "POST"],
  })
);

// Routes
app.use("/", require("./Routes/routes"));
app.get("/", (req, res) => {
  res.status(200).send({
    Message:
      "This is IMConnect API built by IBANZE Miracle. Access the web app at: https://imconnect.netlify.app/",
  });
});

// Initialize Socket.io
initialize(server);

// Set keep-alive and headers timeout
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
