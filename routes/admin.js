const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Project = require("../models/Project");
const path = require("path");
const router = express.Router();
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const upload = multer({ storage });
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "uploads"; // Default folder
    let allowedFormats = [];

    // Determine the folder and formats based on file type
    if (file.mimetype.startsWith("image/")) {
      folder = "project_images";
      allowedFormats = ["jpg", "png", "jpeg"];
    } else if (file.mimetype === "application/pdf") {
      folder = "project_pdfs";
      allowedFormats = ["pdf"];
    } else if (
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      folder = "project_documents"; // New folder for Word documents
      allowedFormats = ["doc", "docx"]; // Add Word document formats
    }

    return {
      folder,
      allowed_formats: allowedFormats,
    };
  },
});

const upload = multer({ storage });

// Default Admin Creation (to be used once)
router.get("/initialize-admin", async (req, res) => {
  const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existingAdmin) {
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    await admin.save();
    res.send("Default admin created");
  } else {
    res.send("Admin already exists");
  }
});

// Admin Login
router.get("/login", (req, res) => res.render("admin/login"));
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  // Check if admin exists and password matches
  if (admin && (await bcrypt.compare(password, admin.password))) {
    req.session.admin = admin;
    res.redirect("/admin/dashboard");
  } else {
    res.send("Invalid login");
  }
});

// Admin Dashboard
router.get("/dashboard", isAuthenticated, (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  res.render("admin/dashboard");
});

// Add Project
router.get("/add-project", isAuthenticated, (req, res) =>
  res.render("admin/addProject")
);
router.post(
  "/add-project",
  isAuthenticated,
  upload.fields([
    { name: "banner", maxCount: 1 }, // For images
    { name: "pdf", maxCount: 1 }, // For PDFs
  ]),
  async (req, res) => {
    try {
      const { title, description, author, supervisor, yearOfCompletion } =
        req.body;

      // Debugging logs for uploaded files and request body
      console.log("Files:", req.files);
      console.log("Body:", req.body);

      const newProject = new Project({
        title,
        description,
        author,
        supervisor,
        yearOfCompletion,
        imagePath: req.files?.banner ? req.files.banner[0].path : null,
        pdfPath: req.files?.pdf ? req.files.pdf[0].path : null,
      });

      // Save the project document
      const savedProject = await newProject.save();

      // Debugging log for saved project
      console.log("Saved Project in Database:", savedProject);

      req.flash("success", "Project added successfully!");
      res.redirect("/admin/add-project");
    } catch (error) {
      console.error("Error adding project:", error);
      req.flash("error", "Error: Project title must be unique.");
      res.redirect("/admin/add-project");
    }
  }
);

// GET route to render the update form
router.get("/update-project/:id", isAuthenticated, async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      req.flash("error", "Project not found.");
      return res.redirect("/project/search-project"); // Redirect to search page if project is not found
    }
    res.render("admin/update-project", {
      project,
      successMessage: req.flash("success"),
      errorMessage: req.flash("error"),
    });
  } catch (error) {
    console.error("Error fetching project for update:", error);
    req.flash("error", "Error loading project update form.");
    res.redirect("/project/search-project");
  }
});

router.post(
  "/update-project/:id",
  isAuthenticated,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req, res) => {
    const projectId = req.params.id;
    const { title, description, author, supervisor, yearOfCompletion } =
      req.body;

    const updateData = {
      title,
      description,
      author,
      supervisor,
      yearOfCompletion,
      imagePath: req.files?.banner ? req.files.banner[0].path : undefined,
      pdfPath: req.files?.pdf ? req.files.pdf[0].path : undefined, // Update PDF if provided
    };

    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true }
      );

      if (!updatedProject) {
        req.flash("error", "Project not found.");
        return res.redirect("/project/search-project");
      }

      req.flash("success", "Project updated successfully!");
      res.redirect("/project/search-project");
    } catch (error) {
      console.error("Error updating project:", error);
      req.flash("error", "Error updating project: Title must be unique.");
      res.redirect(`/admin/update-project/${projectId}`);
    }
  }
);

// Delete Project
router.post("/delete-project/:id", isAuthenticated, async (req, res) => {
  const projectId = req.params.id;

  try {
    const deletedProject = await Project.findByIdAndDelete(projectId);
    if (!deletedProject) {
      req.flash("error", "Project not found.");
      return res.redirect("/project/search-project");
    }
    req.flash("success", "Project deleted successfully.");
    res.redirect("/project/search-project");
  } catch (error) {
    console.error("Error deleting project:", error);
    req.flash("error", "Failed to delete project.");
    res.redirect("/project/search-project");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Failed to destroy session:", err); // Log the error for debugging
      return res.redirect("/admin/dashboard");
    }
    res.redirect("/admin/login");
  });
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.redirect("/admin/login");
}
module.exports = router;
