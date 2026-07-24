const ResumeCollection = require('../models/ResumeCollection');

// Helper to generate a slug token
function generateShareToken(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return slug ? `${slug}-${randomChars}` : randomChars;
}

const resumeCollectionController = {
  /**
   * POST /api/resume-collections
   * Creates a new Resume Collection.
   */
  async createCollection(req, res) {
    try {
      const { title, student_ids, company_name, salary, jd } = req.body;
      const createdBy = req.user?.id || req.body.created_by;

      if (!title) {
        return res.status(400).json({ message: 'Collection title is required' });
      }

      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: 'At least one student must be selected' });
      }

      // Generate random/slug share token
      const shareToken = generateShareToken(title);

      const collectionId = await ResumeCollection.create({
        title,
        shareToken,
        createdBy,
        studentIds: student_ids,
        companyName: company_name,
        salary,
        jd
      });

      res.status(201).json({
        message: 'Resume Collection created successfully',
        collection: {
          id: collectionId,
          title,
          share_token: shareToken,
          created_by: createdBy,
          share_url: `/resumes/share/${shareToken}`
        }
      });
    } catch (error) {
      console.error('Create collection error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resume-collections
   * Get all collections.
   */
  async getAllCollections(req, res) {
    try {
      const collections = await ResumeCollection.getAll();
      res.json(collections);
    } catch (error) {
      console.error('Get all collections error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/resume-collections/:id
   * Get collection details by ID.
   */
  async getCollectionDetail(req, res) {
    try {
      const { id } = req.params;
      const collection = await ResumeCollection.getById(id);
      
      if (!collection) {
        return res.status(404).json({ message: 'Collection not found' });
      }

      res.json(collection);
    } catch (error) {
      console.error('Get collection details error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * DELETE /api/resume-collections/:id
   * Delete a collection.
   */
  async deleteCollection(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ResumeCollection.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Collection not found' });
      }

      res.json({ message: 'Collection deleted successfully' });
    } catch (error) {
      console.error('Delete collection error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * GET /api/public/resumes/:token
   * Bypasses auth completely, retrieves collection details and mapped students.
   */
  async getPublicCollectionByToken(req, res) {
    try {
      const { token } = req.params;
      const collection = await ResumeCollection.getByToken(token);
      
      if (!collection) {
        return res.status(404).json({ message: 'Resume collection not found, expired, or inactive' });
      }

      res.json(collection);
    } catch (error) {
      console.error('Get public collection error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * POST /api/public/resumes/:token/review
   * Saves recruiter review and evaluation details.
   */
  async submitPublicReview(req, res) {
    try {
      const { token } = req.params;
      const { student_id, review_status, review_comment } = req.body;

      if (!student_id || !review_status) {
        return res.status(400).json({ message: 'student_id and review_status are required' });
      }

      // Check if collection exists and is active
      const collection = await ResumeCollection.getByToken(token);
      if (!collection) {
        return res.status(404).json({ message: 'Resume collection not found, expired, or inactive' });
      }

      // Verify student belongs to this collection
      const belongs = collection.students.some(s => s.id === parseInt(student_id));
      if (!belongs) {
        return res.status(403).json({ message: 'Candidate does not belong to this collection' });
      }

      const updated = await ResumeCollection.updateStudentReview(collection.id, student_id, {
        reviewStatus: review_status,
        reviewComment: review_comment
      });

      if (!updated) {
        return res.status(500).json({ message: 'Failed to submit review' });
      }

      res.json({ message: 'Evaluation review saved successfully' });
    } catch (error) {
      console.error('Submit public review error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * POST /api/resume-collections/:id/students
   * Adds new candidates to an existing collection link.
   */
  async addStudentsToCollection(req, res) {
    try {
      const { id } = req.params;
      const { student_ids } = req.body;

      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: 'student_ids must be a non-empty array' });
      }

      const collection = await ResumeCollection.getById(id);
      if (!collection) {
        return res.status(404).json({ message: 'Collection not found' });
      }

      const addedCount = await ResumeCollection.addStudents(id, student_ids);
      const updatedCollection = await ResumeCollection.getById(id);

      res.json({
        message: `${addedCount} student(s) added to collection`,
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Add students to collection error:', error);
      res.status(500).json({ message: 'Server error adding candidates to collection' });
    }
  },

  /**
   * DELETE /api/resume-collections/:id/students/:studentId
   * Removes a candidate from an existing collection link.
   */
  async removeStudentFromCollection(req, res) {
    try {
      const { id, studentId } = req.params;

      const collection = await ResumeCollection.getById(id);
      if (!collection) {
        return res.status(404).json({ message: 'Collection not found' });
      }

      const removed = await ResumeCollection.removeStudent(id, studentId);
      if (!removed) {
        return res.status(400).json({ message: 'Candidate was not found in this collection' });
      }

      const updatedCollection = await ResumeCollection.getById(id);

      res.json({
        message: 'Candidate removed from collection',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Remove student from collection error:', error);
      res.status(500).json({ message: 'Server error removing candidate from collection' });
    }
  },

  /**
   * PUT /api/resume-collections/:id
   * Updates collection metadata (title, company_name, salary, jd).
   */
  async updateCollection(req, res) {
    try {
      const { id } = req.params;
      const { title, company_name, salary, jd } = req.body;

      const collection = await ResumeCollection.getById(id);
      if (!collection) {
        return res.status(404).json({ message: 'Collection not found' });
      }

      await ResumeCollection.update(id, {
        title,
        companyName: company_name,
        salary,
        jd
      });

      const updatedCollection = await ResumeCollection.getById(id);
      res.json({
        message: 'Collection updated successfully',
        collection: updatedCollection
      });
    } catch (error) {
      console.error('Update collection error:', error);
      res.status(500).json({ message: 'Server error updating collection' });
    }
  }
};

module.exports = resumeCollectionController;
