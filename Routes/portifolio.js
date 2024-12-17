const { Router } = require("express");
const WorkOffer = require("../models/WorkOffer");
const asyncHandler = require("express-async-handler");
const portifolio = Router();

portifolio.get(
  "/work",
  asyncHandler(async (req, res) => {
    try {
      const allMessages = await WorkOffer.find();

      console.log("Fetched data:", allMessages);

      res.status(200).send(allMessages);
    } catch (error) {
      console.error("Error fetching data:", error);

      res
        .status(500)
        .json({ error: "Failed to fetch messages. Please try again later." });
    }
  })
);

portifolio.post(
  "/work",
  asyncHandler(async (req, res) => {
    try {
      const { names, email, phone, message } = req.body;

      const newMessage = new WorkOffer({
        names,
        email,
        phone,
        message,
      });

      await newMessage.save();

      console.log("Data saved:", newMessage);

      res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error saving data:", error);

      res
        .status(500)
        .json({ error: "Failed to save message. Please try again later." });
    }
  })
);

module.exports = portifolio;
