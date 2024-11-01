const express = require("express");
const Project = require("../models/Project");
const mongoose = require("mongoose");
const router = express.Router();

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.redirect("/admin/login");
}

// Route to render the search projects page
router.get("/search-project", isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find(); // Fetch all projects from the database
    res.render("admin/search-project", { projects }); // Pass the projects to the view
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Live search route with pagination
// Live search route with pagination
router.get("/api/search-project", isAuthenticated, async (req, res) => {
  const term = req.query.term || "";
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  try {
    const query = term ? { title: { $regex: term, $options: "i" } } : {};
    const projects = await Project.find(query).skip(skip).limit(limit);
    const totalProjects = await Project.countDocuments(query);

    res.json({
      projects,
      hasMore: totalProjects > page * limit,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
    });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).json({ message: "An error occurred during the search." });
  }
});

// Route to display project details
// Route to display project details
router.get("/project-details/:id", async (req, res) => {
  const projectId = req.params.id;

  // Check if the ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    req.flash("error", "Invalid project ID format");
    return res.redirect("/project/search-project");
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      req.flash("error", "Project not found");
      return res.redirect("/project/search-project");
    }
    res.render("admin/projectDetails", { project });
  } catch (error) {
    console.error("Error fetching project details:", error);
    req.flash("error", "An error occurred while fetching project details");
    res.redirect("/project/search-project");
  }
});

// PUT route to handle project editing
router.put("/api/edit-project/:id", async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      req.flash("error", "Project not found");
      return res.redirect("/project/search-project");
    }
    res.render("admin/editProject", { project }); // render editProject.ejs with project data
  } catch (error) {
    console.error("Error fetching project:", error);
    req.flash("error", "Server error");
    res.redirect("/project/search-project");
  }
});

module.exports = router;
