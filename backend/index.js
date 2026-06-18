import "dotenv/config";
import cors from "cors";
import express from "express";
import { chatwithgroq } from "./utils/groqapi.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.post("/", async (req, res) => {
  try {
    const messages = req.body?.messages;
    const response = await chatwithgroq(messages);
    res.status(200).json({ response });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error?.message || "Chat request failed.",
      },
    });
  }
});

app.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
