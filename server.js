require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
const mongoose = require("mongoose");
const User = require("./models/User");
const app = express();
const PORT = process.env.PORT || 3000;
const http = require("http");
const { Server } = require("socket.io");

const { corsOptions, socketCors } = require("./config/cors");
const { getAllMessages } = require("./controllers/messageControllers");
const { initialize } = require("./socket");

mongoose
  .connect("mongodb://localhost:27017/imconnect")
  .then(() => console.log("Connected to mongodb successfully"))
  .catch((err) => console.log(`Error : ${err}`));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cors(corsOptions));

app.use(
  session({
    secret: "miraclecode11",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 100000 * 60 * 60 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

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

const server = http.createServer(app);

initialize(server);

server.listen(5000, () => {
  console.log("Socket running on port 5000");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
