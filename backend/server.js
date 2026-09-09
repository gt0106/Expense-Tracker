require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Expense Tracker API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);