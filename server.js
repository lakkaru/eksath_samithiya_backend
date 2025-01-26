const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const connectDB = require("./config/DB");

const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/memberRoutes");
const loanRoutes = require("./routes/loanRoutes");

const PORT = process.env.PORT || 5000;

const app = express();
// Connect to MongoDB
connectDB();
app.use(cors());
// app.use(cors({ origin: 'https://wil.lakkaru.com' }));
app.use(express.json());

//routes
app.use("/auth", authRoutes);
app.use("/member", memberRoutes);
app.use("/loan", loanRoutes);

//Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
