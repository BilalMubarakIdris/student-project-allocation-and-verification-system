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

// Set up Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "project_images", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg"],
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

// Updated add-project route with Multer middleware
router.post(
  "/add-project",
  isAuthenticated,
  upload.single("banner"),
  async (req, res) => {
    const { title, description, author, supervisor, yearOfCompletion } =
      req.body;
    const newProject = new Project({
      title,
      description,
      author,
      supervisor,
      yearOfCompletion,
      imagePath: req.file ? req.file.path : null,
    });

    try {
      await newProject.save();
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

// POST route to handle the update submission
// POST route to handle the update submission
router.post(
  "/update-project/:id",
  isAuthenticated,
  upload.single("banner"),
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
      imagePath: req.file ? req.file.path : undefined, // Only update image if a new one is uploaded
    };

    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true } // Return the updated document
      );

      if (!updatedProject) {
        req.flash("error", "Project not found.");
        return res.redirect("/project/search-project");
      }

      req.flash("success", "Project updated successfully!");
      res.redirect("/project/search-project"); // Redirect to search or relevant page after update
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

// Logout route
// router.get("/logout", (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       return res.redirect("/admin/dashboard");
//     }
//     res.redirect("/admin/login");
//   });
// });
// Logout Route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.flash("error", "Failed to log out. Please try again.");
      return res.redirect("/admin/dashboard");
    }
    req.flash("success", "You have been logged out successfully.");
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
