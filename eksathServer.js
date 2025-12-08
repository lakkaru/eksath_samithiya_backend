const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const connectDB = require("./config/DB");

const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/memberRoutes");
const loanRoutes = require("./routes/loanRoutes");
const accountRoutes = require("./routes/accountRoutes");
const funeralRoutes = require("./routes/funeralRoutes");
const formsRoutes = require("./routes/formsRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const periodBalanceRoutes = require("./routes/periodBalanceRoutes");
const officerRoutes = require("./routes/officerRoutes");
const adminManagementRoutes = require("./routes/adminManagementRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");
const commonWorkRoutes = require("./routes/commonWorkRoutes");
// const whatsappRoutes = require("./routes/whatsappRoutes");
const whatsappCloudRoutes = require("./routes/whatsappCloudRoutes");

const PORT = process.env.PORT || 5000;

const app = express();
// Connect to MongoDB
connectDB();
app.use(cors());
// app.use(
//   cors({
//     origin: "http://localhost:8000", // Match your frontend origin
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     credentials: true, // If sending cookies or credentials
//   })
// );
// app.use(
//   cors({
//     origin: "https://wil.lakkaru.com", // Replace with your frontend's origin
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// Explicitly handle OPTIONS requests
// app.options("*", (req, res) => {
//   res.sendStatus(204); // No Content
// });
// Explicitly handle OPTIONS requests
// app.options("*", (req, res) => {
//   res.sendStatus(204); // No Content
// });

// Mount WhatsApp Cloud Webhook BEFORE express.json() to allow raw body capture
app.use("/whatsapp-cloud", whatsappCloudRoutes);

app.use(express.json());

//routes
app.use("/auth", authRoutes);
app.use("/member", memberRoutes);
app.use("/loan", loanRoutes);
app.use("/account", accountRoutes);
app.use("/funeral", funeralRoutes);
app.use("/forms", formsRoutes);
app.use("/meeting", meetingRoutes);
app.use("/period-balance", periodBalanceRoutes);
app.use("/officer", officerRoutes);
app.use("/admin-management", adminManagementRoutes);
app.use("/system-settings", systemSettingsRoutes);
app.use("/commonwork", commonWorkRoutes);
// app.use("/whatsapp", whatsappRoutes);
// app.use("/whatsapp", whatsappRoutes);
// app.use("/whatsapp-cloud", whatsappCloudRoutes); // Moved up

//Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
