const Course = require('../models/courseModel');
const CourseMembership = require('../models/courseMembershipModel');

const courseController = {
  // Public or Authenticated list of active courses
  async getAllCourses(req, res) {
    try {
      const isSuperAdmin = req.user?.role === 'super_admin';
      const courses = await Course.getAll(isSuperAdmin);
      res.json({ success: true, courses });
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ success: false, message: 'Server error fetching courses' });
    }
  },

  // Resolve course by slug for frontend routing & bootstrap
  async getCourseBySlug(req, res) {
    try {
      const { slug } = req.params;
      const course = await Course.findBySlug(slug);

      if (!course) {
        return res.status(404).json({ success: false, message: `Course with slug '${slug}' not found` });
      }

      let userRoleInCourse = null;
      let userEnrollments = [];

      // If user is authenticated, retrieve their role and other active courses
      if (req.user) {
        userEnrollments = await CourseMembership.getUserMemberships(req.user.id);
        const currentMembership = userEnrollments.find(m => m.course_id === course.id);
        if (currentMembership) {
          userRoleInCourse = currentMembership.role;
        } else if (req.user.role === 'super_admin') {
          userRoleInCourse = 'super_admin';
        }
      }

      res.json({
        success: true,
        course,
        userRole: userRoleInCourse,
        userEnrollments
      });
    } catch (error) {
      console.error('Get course by slug error:', error);
      res.status(500).json({ success: false, message: 'Server error resolving course' });
    }
  },

  // Get active courses for current authenticated user
  async getMyCourses(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (req.user.role === 'super_admin') {
        const allCourses = await Course.getAll(true);
        return res.json({
          success: true,
          courses: allCourses.map(c => ({
            ...c,
            course_id: c.id,
            course_name: c.name,
            course_code: c.code,
            course_slug: c.slug,
            role: 'super_admin'
          }))
        });
      }

      const memberships = await CourseMembership.getUserMemberships(req.user.id);
      res.json({ success: true, courses: memberships });
    } catch (error) {
      console.error('Get my courses error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Super Admin: Create Course
  async createCourse(req, res) {
    try {
      const { name, code, slug, description, shortName, duration, logoUrl, thumbnailUrl, status } = req.body;

      if (!name || !code || !slug) {
        return res.status(400).json({ success: false, message: 'Name, code, and slug are required' });
      }

      // Check for duplicate code or slug
      const existingSlug = await Course.findBySlug(slug);
      if (existingSlug) {
        return res.status(400).json({ success: false, message: `Course with slug '${slug}' already exists` });
      }

      const existingCode = await Course.findByCode(code);
      if (existingCode) {
        return res.status(400).json({ success: false, message: `Course with code '${code}' already exists` });
      }

      const courseId = await Course.create({
        name,
        code,
        slug,
        description,
        shortName,
        duration,
        logoUrl,
        thumbnailUrl,
        status: status || 'active',
        createdBy: req.user.id
      });

      const newCourse = await Course.findById(courseId);
      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        course: newCourse
      });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({ success: false, message: 'Server error creating course' });
    }
  },

  // Super Admin: Update Course
  async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const { name, code, slug, description, shortName, duration, logoUrl, thumbnailUrl, status } = req.body;

      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (slug && slug.toLowerCase() !== course.slug) {
        const existingSlug = await Course.findBySlug(slug);
        if (existingSlug && existingSlug.id !== parseInt(id)) {
          return res.status(400).json({ success: false, message: `Slug '${slug}' is already taken` });
        }
      }

      if (code && code.toUpperCase() !== course.code) {
        const existingCode = await Course.findByCode(code);
        if (existingCode && existingCode.id !== parseInt(id)) {
          return res.status(400).json({ success: false, message: `Code '${code}' is already taken` });
        }
      }

      await Course.update(id, {
        name,
        code,
        slug,
        description,
        shortName,
        duration,
        logoUrl,
        thumbnailUrl,
        status
      });

      const updated = await Course.findById(id);
      res.json({
        success: true,
        message: 'Course updated successfully',
        course: updated
      });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ success: false, message: 'Server error updating course' });
    }
  },

  // Super Admin: Soft delete / toggle course status
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      await Course.delete(id);
      res.json({ success: true, message: 'Course deactivated successfully' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ success: false, message: 'Server error deactivating course' });
    }
  },

  // Get members of a specific course (staff & students)
  async getCourseMembers(req, res) {
    try {
      const courseId = req.courseId || req.params.id;
      const { role } = req.query;
      const members = await CourseMembership.getCourseMembers(courseId, role);
      res.json({ success: true, members });
    } catch (error) {
      console.error('Get course members error:', error);
      res.status(500).json({ success: false, message: 'Server error fetching course members' });
    }
  },

  // Assign or enroll a member into a course
  async assignMember(req, res) {
    try {
      const courseId = req.courseId || req.params.id;
      const { userId, role, batchId } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ success: false, message: 'User ID and role are required' });
      }

      await CourseMembership.enroll({
        userId,
        courseId,
        role,
        batchId: batchId || null
      });

      res.json({ success: true, message: 'User assigned to course successfully' });
    } catch (error) {
      console.error('Assign course member error:', error);
      res.status(500).json({ success: false, message: 'Server error assigning user to course' });
    }
  },

  // Remove a member from a course
  async removeMember(req, res) {
    try {
      const courseId = req.courseId || req.params.id;
      const { userId } = req.params;

      await CourseMembership.remove(userId, courseId);
      res.json({ success: true, message: 'User removed from course successfully' });
    } catch (error) {
      console.error('Remove course member error:', error);
      res.status(500).json({ success: false, message: 'Server error removing user from course' });
    }
  }
};

module.exports = courseController;
