const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);
// Initialize flash messages
app.use(flash());

// Pass flash messages to all views
app.use((req, res, next) => {
  res.locals.errorMessage = req.flash("error");
  res.locals.successMessage = req.flash("success");
  next();
});
app.use("/admin", require("./routes/admin"));
app.use("/project", require("./routes/project"));
app.get("/", (req, res) => {
  res.render("home");
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render("404"); // Render the 404 page
});
app.listen(3000, () => console.log("Server running on port 3000"));
