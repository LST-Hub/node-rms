const db = require("../models/db");

// Save resume data to database
exports.saveResumeData = async (req, res) => {
  try {
    const { resumeData } = req.body;
    const userId = req.user.userId; // From auth middleware

    // Validate required data
    if (!resumeData || !Array.isArray(resumeData)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume data format. Expected an array."
      });
    }

    if (resumeData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No resume data provided"
      });
    }

    const insertedRecords = [];

    // Insert each resume data record
    for (const resume of resumeData) {
      const [result] = await db.execute(
        `INSERT INTO resume_data (
          user_id, job_id, name, email, phone, location, designation,
          total_experience, skills, education, summary, file_name, file_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          resume.job_id || null,
          resume.name || null,
          resume.email || null,
          resume.phone || null,
          resume.location || null,
          resume.designation || null,
          resume.total_experience || null,
          JSON.stringify(resume.skills || []),
          JSON.stringify(resume.education || []),
          resume.summary || null,
          resume.file_name || null,
          resume.file_size || 0
        ]
      );

      insertedRecords.push({
        id: result.insertId,
        ...resume
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully saved ${insertedRecords.length} resume record(s)`,
      data: insertedRecords
    });

  } catch (error) {
    console.error("Error saving resume data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get user's resume data
exports.getUserResumeData = async (req, res) => {
  try {
    console.log("Fetching resume data for user:", req);
    const userId = req.user.userId;
    const { job_id } = req.query;

    let query = "SELECT * FROM resume_data WHERE user_id = ?";
    let params = [userId];

    if (job_id) {
      query += " AND job_id = ?";
      params.push(job_id);
    }

    query += " ORDER BY created_at DESC";

    const [resumeData] = await db.execute(query, params);

    // Parse JSON fields
    const formattedData = resumeData.map(resume => ({
      ...resume,
      skills: JSON.parse(resume.skills || '[]'),
      education: JSON.parse(resume.education || '[]')
    }));

    res.status(200).json({
      success: true,
      message: "Resume data retrieved successfully",
      data: formattedData
    });

  } catch (error) {
    console.error("Error retrieving resume data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};