require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const http = require("http");
const { Server } = require("socket.io");
const { corsOptions, socketCors } = require("./config/cors");
const { initialize } = require("./socket");

const app = express();
const PORT = process.env.PORT || 4000;

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

app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ limit: "300mb", extended: true }));
app.use(cors(corsOptions));

app.use("/", require("./routes/routes"));

const server = http.createServer(app);
const io = new Server(server, socketCors);

initialize(io);

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

module.exports = app;

server.listen(5001, () => {
  console.log(`Socket server running on port 5001`);
});
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
