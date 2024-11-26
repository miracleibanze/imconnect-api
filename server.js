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

// Create an HTTP server that handles both Express and Socket.io
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
const io = new Server(server, socketCors);

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
app.get("/", (req, res) => {
  return res.status(200).send({
    Message:
      "This is IMConnect Api that is build to facilitate IMConnect web site that was build by IBANZE Miracle. a passionate and talented Web developer. you can access that web site he built on : https://imconnect.netlify.app/ , Enjoy the creativity of this boy and feel free to connect him and give him opportunities to develop his talent.",
  });
});

// Initialize socket.io event handling
initialize(io);

// Set keep-alive and headers timeout
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// Start the server on a single port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
