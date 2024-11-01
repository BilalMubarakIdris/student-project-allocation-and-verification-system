const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    imagePath: String,
    description: String,
    author: String,
    supervisor: String,
    yearOfCompletion: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);