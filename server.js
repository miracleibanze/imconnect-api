require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const http = require("http");
const { Server } = require("socket.io");

const { corsOptions } = require("./config/cors");
const { initialize } = require("./socket");

const app = express();
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ limit: "300mb", extended: true }));
app.use(cors(corsOptions));

app.get("/", async (req, res) => {
  await User.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: new Date("01/01/2025") } }
  );

  res.status(200).send({ message: "Welcome to IMConnect API" });
});
app.use("/", require("./Routes/routes"));

const server = http.createServer(app);
initialize(server);

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

server.listen(5000, () => {
  console.log(`socket running on port 5000`);
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
