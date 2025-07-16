const express = require("express");
const router = express.Router();
const resumeController = require("../controllers/resumeController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/", resumeController.saveResumeData);
router.get("/", resumeController.getUserResumeData);


module.exports = router;