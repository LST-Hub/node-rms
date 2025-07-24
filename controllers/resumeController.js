const db = require("../models/db");

exports.saveResumeData = async (req, res) => {
  try {
    const { resumeData, jobDescription,jobId } = req.body;
    console.log("Saving resume data for user:", req.body);
    const userId = req.user.userId; 
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
    for (const analysis of resumeData) {
      const [result] = await db.execute(
        `INSERT INTO resume_analysis (
          user_id, job_id, job_description, name, email, phone, fit_score, key_matches, key_gaps, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          jobId || null,
          jobDescription || null,
          analysis.candidate_name || null,
          analysis.candidate_email || null,
          analysis.candidate_phone || null,
          analysis.fit_percentage || 0,
          JSON.stringify(analysis.key_matches || []),
          JSON.stringify(analysis.key_gaps || []),
          analysis.summary || null
        ]
      );

      insertedRecords.push({
        id: result.insertId,
        user_id: userId,
        ...analysis
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

exports.getUserResumeData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { job_id } = req.query;

    let query = "SELECT * FROM resume_analysis WHERE user_id = ?";
    let params = [userId];

    if (job_id) {
      query += " AND job_id = ?";
      params.push(job_id);
    }

    query += " ORDER BY created_at DESC";
    const [resumeData] = await db.execute(query, params);
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


exports.deleteResumeData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid resume ID is required"
      });
    }

    const [existingRecord] = await db.execute(
      "SELECT id, name FROM resume_analysis WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existingRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resume analysis record not found or access denied"
      });
    }

    const [result] = await db.execute(
      "DELETE FROM resume_analysis WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Successfully deleted resume analysis ID: ${id}`);
      
      res.status(200).json({
        success: true,
        message: "Resume analysis deleted successfully",
        data: {
          deleted_id: parseInt(id),
          deleted_record: existingRecord[0]
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to delete resume analysis"
      });
    }

  } catch (error) {
    console.error("❌ Error deleting resume analysis:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
