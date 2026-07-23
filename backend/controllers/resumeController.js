const Resume = require('../models/Resume');
const cloudinaryService = require('../services/cloudinaryService');
const pool = require('../config/db');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

// Helper to save file locally on disk if Cloudinary is unavailable or fails
const saveLocalResume = (file) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const localFileName = `resume-${uniqueSuffix}.pdf`;
  const filePath = path.join(uploadsDir, localFileName);
  
  fs.writeFileSync(filePath, file.buffer);
  
  return {
    file_name: localFileName,
    original_filename: file.originalname || localFileName,
    relative_path: `uploads/resumes/${localFileName}`
  };
};

const resumeController = {
  /**
   * POST /api/resumes/upload
   * Handles resume file upload (PDF format, max 10MB) to Cloudinary or local fallback.
   */
  async uploadResume(req, res) {
    try {
      const rawStudentId = req.body.student_id || req.user?.id;
      const studentId = parseInt(rawStudentId, 10);
      const { resume_title } = req.body;

      if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ message: 'Valid student_id is required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No resume PDF file uploaded' });
      }

      let cloudinaryPublicId = null;
      let cloudinaryUrl = null;
      let fileName = req.file.originalname;

      // Perform Cloudinary upload if configured, else fall back to local disk storage
      if (cloudinaryService.isConfigured()) {
        try {
          const uploadResult = await cloudinaryService.uploadResume(req.file);
          cloudinaryPublicId = uploadResult.public_id;
          cloudinaryUrl = uploadResult.secure_url;
          fileName = uploadResult.original_filename;
        } catch (cloudinaryError) {
          console.warn('Cloudinary upload failed, using local disk fallback:', cloudinaryError.message);
          const localResult = saveLocalResume(req.file);
          fileName = localResult.file_name;
        }
      } else {
        console.log('Cloudinary not configured on host. Saving resume locally...');
        const localResult = saveLocalResume(req.file);
        fileName = localResult.file_name;
      }

      // Create db record
      const result = await Resume.create({
        studentId,
        resumeTitle: resume_title || 'Resume',
        resumeFileName: fileName,
        cloudinaryPublicId,
        cloudinaryUrl
      });

      res.status(201).json({
        message: 'Resume uploaded successfully',
        resume: {
          id: result.id,
          student_id: studentId,
          resume_title: resume_title || 'Resume',
          file_name: fileName,
          cloudinary_public_id: cloudinaryPublicId,
          cloudinary_url: cloudinaryUrl,
          version: result.version,
          is_latest: true
        }
      });
    } catch (error) {
      console.error('Upload resume error:', error);
      res.status(500).json({ message: error.message || 'Server error uploading resume', error: error.message });
    }
  },

  /**
   * DELETE /api/resumes/:id
   * Deletes a resume from Cloudinary and database metadata.
   */
  async deleteResume(req, res) {
    try {
      const { id } = req.params;

      const resume = await Resume.getById(id);
      if (!resume) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      // Delete from Cloudinary
      if (resume.cloudinary_public_id && cloudinaryService.isConfigured()) {
        try {
          await cloudinaryService.deleteResume(resume.cloudinary_public_id);
        } catch (delErr) {
          console.warn('Cloudinary deletion failed:', delErr.message);
        }
      }

      // Delete from DB
      await Resume.delete(id);

      res.json({ message: 'Resume deleted successfully' });
    } catch (error) {
      console.error('Delete resume error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * PUT /api/resumes/:id
   * Replaces a resume (deletes old file, uploads new PDF, keeps version history).
   */
  async replaceResume(req, res) {
    try {
      const { id } = req.params;
      const { resume_title } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'No resume PDF file uploaded' });
      }

      const oldResume = await Resume.getById(id);
      if (!oldResume) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      // Delete old file from Cloudinary if existed
      if (oldResume.cloudinary_public_id && cloudinaryService.isConfigured()) {
        try {
          await cloudinaryService.deleteResume(oldResume.cloudinary_public_id);
        } catch (delErr) {
          console.warn('Could not delete old Cloudinary resume:', delErr.message);
        }
      }

      let cloudinaryPublicId = null;
      let cloudinaryUrl = null;
      let fileName = req.file.originalname;

      if (cloudinaryService.isConfigured()) {
        try {
          const uploadResult = await cloudinaryService.uploadResume(req.file);
          cloudinaryPublicId = uploadResult.public_id;
          cloudinaryUrl = uploadResult.secure_url;
          fileName = uploadResult.original_filename;
        } catch (cloudinaryError) {
          console.warn('Cloudinary replace upload failed, using local disk fallback:', cloudinaryError.message);
          const localResult = saveLocalResume(req.file);
          fileName = localResult.file_name;
        }
      } else {
        const localResult = saveLocalResume(req.file);
        fileName = localResult.file_name;
      }

      // Save as a new version in the database
      const result = await Resume.create({
        studentId: oldResume.student_id,
        resumeTitle: resume_title || oldResume.resume_title || 'Resume',
        resumeFileName: fileName,
        cloudinaryPublicId,
        cloudinaryUrl
      });

      res.json({
        message: 'Resume replaced successfully',
        resume: {
          id: result.id,
          student_id: oldResume.student_id,
          resume_title: resume_title || oldResume.resume_title || 'Resume',
          file_name: fileName,
          cloudinary_public_id: cloudinaryPublicId,
          cloudinary_url: cloudinaryUrl,
          version: result.version,
          is_latest: true
        }
      });
    } catch (error) {
      console.error('Replace resume error:', error);
      res.status(500).json({ message: error.message || 'Server error replacing resume', error: error.message });
    }
  },

  /**
   * GET /api/resumes/student/:id
   * Get latest resume for a student.
   */
  async getLatestResume(req, res) {
    try {
      const { id } = req.params;
      const resume = await Resume.getLatestByStudent(id);
      
      if (!resume) {
        return res.status(404).json({ message: 'No resume found for this student' });
      }

      res.json(resume);
    } catch (error) {
      console.error('Get latest resume error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/history/:studentId
   * Get full upload history for a student.
   */
  async getHistory(req, res) {
    try {
      const { studentId } = req.params;
      const history = await Resume.getHistoryByStudent(studentId);
      res.json(history);
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes
   * Get all students with their latest resume info, notes, and search/filter.
   */
  async getAllResumes(req, res) {
    try {
      const students = await Resume.getAllStudentsWithResumeStatus();
      
      // Fetch notes and recruiter reviews for all students
      const studentsWithNotes = await Promise.all(
        students.map(async (student) => {
          const notes = await Resume.getNotes(student.id);
          const reviews = await Resume.getRecruiterReviews(student.id);
          return {
            ...student,
            notes,
            recruiter_reviews: reviews
          };
        })
      );

      res.json(studentsWithNotes);
    } catch (error) {
      console.error('Get all resumes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/search
   * Search student resumes by name, email, or mobile.
   */
  async searchResumes(req, res) {
    try {
      const { query } = req.query;
      const students = await Resume.getAllStudentsWithResumeStatus();
      
      let filtered = students;
      if (query) {
        const cleanQuery = query.toLowerCase();
        filtered = students.filter(
          s =>
            (s.name && s.name.toLowerCase().includes(cleanQuery)) ||
            (s.email && s.email.toLowerCase().includes(cleanQuery)) ||
            (s.mobile && s.mobile.toLowerCase().includes(cleanQuery))
        );
      }

      const results = await Promise.all(
        filtered.map(async (student) => {
          const notes = await Resume.getNotes(student.id);
          const reviews = await Resume.getRecruiterReviews(student.id);
          return { ...student, notes, recruiter_reviews: reviews };
        })
      );

      res.json(results);
    } catch (error) {
      console.error('Search resumes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/filter
   * Filter student resumes by domain, batch, status, or date updated.
   */
  async filterResumes(req, res) {
    try {
      const { domain, batch, status, date } = req.query;
      let students = await Resume.getAllStudentsWithResumeStatus();

      // 1. Filter by Domain
      if (domain) {
        students = students.filter(s => s.domain === domain);
      }

      // 2. Filter by Batch
      if (batch) {
        students = students.filter(s => s.batch === batch || s.batch_name === batch);
      }

      // 3. Filter by Resume Status
      if (status) {
        if (status === 'has_resume') {
          students = students.filter(s => s.has_resume === 1);
        } else if (status === 'missing') {
          students = students.filter(s => s.has_resume === 0);
        }
      }

      // 4. Filter by Date Updated
      if (date && date !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);

        students = students.filter(s => {
          if (!s.resume_updated_at) return false;
          const updatedTime = new Date(s.resume_updated_at);

          if (date === 'today') {
            return updatedTime >= startOfDay;
          } else if (date === 'yesterday') {
            return updatedTime >= yesterday && updatedTime < startOfDay;
          } else if (date === 'days_ago') {
            // Updated within the last 7 days but not today/yesterday
            const sevenDaysAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
            return updatedTime >= sevenDaysAgo && updatedTime < yesterday;
          }
          return true;
        });
      }

      const results = await Promise.all(
        students.map(async (student) => {
          const notes = await Resume.getNotes(student.id);
          const reviews = await Resume.getRecruiterReviews(student.id);
          return { ...student, notes, recruiter_reviews: reviews };
        })
      );

      res.json(results);
    } catch (error) {
      console.error('Filter resumes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * POST /api/resumes/notes
   * Add a private notes entry for a student.
   */
  async addNote(req, res) {
    try {
      const { student_id, note } = req.body;
      const createdBy = req.user?.id || req.body.created_by;

      if (!student_id || !note) {
        return res.status(400).json({ message: 'student_id and note text are required' });
      }

      const noteId = await Resume.addNote({
        studentId: student_id,
        note,
        createdBy
      });

      res.status(201).json({
        message: 'Note added successfully',
        note: {
          id: noteId,
          student_id,
          note,
          created_by: createdBy,
          created_at: new Date()
        }
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/notes/:studentId
   * Get all private notes for a student.
   */
  async getNotes(req, res) {
    try {
      const { studentId } = req.params;
      const notes = await Resume.getNotes(studentId);
      res.json(notes);
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * DELETE /api/resumes/notes/:id
   * Delete a note.
   */
  async deleteNote(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Resume.deleteNote(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Note not found' });
      }

      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Delete note error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * PUT /api/resumes/placement/:studentId
   * Update student placement properties (domain, college, passout_year, location, skills, links).
   */
  async updatePlacementInfo(req, res) {
    try {
      const { studentId } = req.params;
      const { domain, college, passout_year, current_location, skills, github, linkedin } = req.body;

      const updated = await Resume.updatePlacementInfo(studentId, {
        domain,
        college,
        passout_year,
        current_location,
        skills,
        github,
        linkedin
      });

      if (!updated) {
        return res.status(404).json({ message: 'Student not found or placement info unchanged' });
      }

      res.json({ message: 'Student placement details updated successfully' });
    } catch (error) {
      console.error('Update placement info error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/download/:id
   * Downloads a single resume, renamed to standard format: [Student Name] - Resume.pdf
   */
  async downloadSingleResume(req, res) {
    try {
      const { id } = req.params;
      const resume = await Resume.getLatestByStudent(id);
      if (!resume) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      const [userRows] = await pool.execute('SELECT name FROM Users WHERE id = ?', [id]);
      if (userRows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      const studentName = userRows[0].name;
      const safeName = studentName.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'Student';

      if (resume.cloudinary_url) {
        const response = await fetch(resume.cloudinary_url);
        if (!response.ok) {
          return res.status(500).json({ message: 'Failed to retrieve resume from Cloudinary' });
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName} - Resume.pdf"`);
        res.send(buffer);
      } else if (resume.file_name) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'uploads', 'resumes', resume.file_name);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: 'Local resume file not found' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName} - Resume.pdf"`);
        res.sendFile(filePath);
      } else {
        return res.status(404).json({ message: 'No resume file associated' });
      }
    } catch (error) {
      console.error('Download resume error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resumes/download-bulk
   * Downloads selected resumes bundled in a ZIP folder.
   */
  async downloadBulkResumes(req, res) {
    try {
      const studentIdsString = req.query.student_ids;
      if (!studentIdsString) {
        return res.status(400).json({ message: 'student_ids query parameter is required' });
      }

      const studentIds = studentIdsString.split(',').map(Number);
      if (studentIds.length === 0) {
        return res.status(400).json({ message: 'At least one student ID must be provided' });
      }

      const [rows] = await pool.execute(
        `SELECT u.id, u.name, sr.cloudinary_url, sr.file_name, sr.resume_file_name 
         FROM Users u
         LEFT JOIN student_resumes sr ON u.id = sr.student_id AND sr.is_latest = TRUE
         WHERE u.id IN (${studentIds.map(() => '?').join(',')}) AND u.role = 'student'`,
        studentIds
      );

      const zip = new JSZip();
      const promises = rows.map(async (student) => {
        if (!student.cloudinary_url && !student.file_name && !student.resume_file_name) return;
        try {
          let buffer;
          if (student.cloudinary_url) {
            const fileResp = await fetch(student.cloudinary_url);
            if (!fileResp.ok) return;
            buffer = Buffer.from(await fileResp.arrayBuffer());
          } else {
            const fs = require('fs');
            const path = require('path');
            const fileName = student.file_name || student.resume_file_name;
            const filePath = path.join(__dirname, '..', 'uploads', 'resumes', fileName);
            if (!fs.existsSync(filePath)) return;
            buffer = fs.readFileSync(filePath);
          }
          const safeName = student.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || `Student-${student.id}`;
          zip.file(`${safeName} - Resume.pdf`, buffer);
        } catch (err) {
          console.error(`Error zipping resume for ${student.name}:`, err);
        }
      });

      await Promise.all(promises);

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="Selected_Student_Resumes.zip"');
      res.send(zipBuffer);
    } catch (error) {
      console.error('Download bulk resumes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/public/resumes/:token/download/:studentId
   * Public download endpoint for single resume renamed.
   */
  async downloadSingleResumePublic(req, res) {
    try {
      const { token, studentId } = req.params;
      const ResumeCollection = require('../models/ResumeCollection');
      const collection = await ResumeCollection.getByToken(token);
      if (!collection) {
        return res.status(404).json({ message: 'Invalid or expired collection token' });
      }

      const student = collection.students.find(s => s.id === parseInt(studentId));
      if (!student) {
        return res.status(404).json({ message: 'Candidate not found in this collection' });
      }

      const safeName = student.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'Student';

      if (student.cloudinary_url) {
        const response = await fetch(student.cloudinary_url);
        if (!response.ok) {
          return res.status(500).json({ message: 'Failed to retrieve resume from Cloudinary' });
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName} - Resume.pdf"`);
        res.send(buffer);
      } else if (student.file_name || student.resume_file_name) {
        const fs = require('fs');
        const path = require('path');
        const fileName = student.file_name || student.resume_file_name;
        const filePath = path.join(__dirname, '..', 'uploads', 'resumes', fileName);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: 'Local resume file not found' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName} - Resume.pdf"`);
        res.sendFile(filePath);
      } else {
        return res.status(404).json({ message: 'Candidate resume not found in this collection' });
      }
    } catch (error) {
      console.error('Public download resume error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/public/resumes/:token/download-bulk
   * Public download endpoint for bulk resumes ZIP.
   */
  async downloadBulkResumesPublic(req, res) {
    try {
      const { token } = req.params;
      const studentIdsString = req.query.student_ids;

      const ResumeCollection = require('../models/ResumeCollection');
      const collection = await ResumeCollection.getByToken(token);
      if (!collection) {
        return res.status(404).json({ message: 'Invalid or expired collection token' });
      }

      let studentsToZip = collection.students;
      if (studentIdsString) {
        const studentIds = studentIdsString.split(',').map(Number);
        studentsToZip = collection.students.filter(s => studentIds.includes(s.id));
      }

      if (studentsToZip.length === 0) {
        return res.status(400).json({ message: 'No candidates selected for download' });
      }

      const zip = new JSZip();
      const promises = studentsToZip.map(async (student) => {
        if (!student.cloudinary_url && !student.file_name && !student.resume_file_name) return;
        try {
          let buffer;
          if (student.cloudinary_url) {
            const fileResp = await fetch(student.cloudinary_url);
            if (!fileResp.ok) return;
            buffer = Buffer.from(await fileResp.arrayBuffer());
          } else {
            const fs = require('fs');
            const path = require('path');
            const fileName = student.file_name || student.resume_file_name;
            const filePath = path.join(__dirname, '..', 'uploads', 'resumes', fileName);
            if (!fs.existsSync(filePath)) return;
            buffer = fs.readFileSync(filePath);
          }
          const safeName = student.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || `Student-${student.id}`;
          zip.file(`${safeName} - Resume.pdf`, buffer);
        } catch (err) {
          console.error(`Error zipping public resume for ${student.name}:`, err);
        }
      });

      await Promise.all(promises);

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const zipName = collection.company_name 
        ? `${collection.company_name.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}_Candidate_Resumes.zip`
        : 'Candidate_Resumes.zip';

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error('Public download bulk resumes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = resumeController;
