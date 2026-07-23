const cloudinary = require('../config/cloudinary');

/**
 * Service for Cloudinary Resume Storage Integration
 */
const cloudinaryService = {
  /**
   * Helper to check if Cloudinary is fully configured
   */
  isConfigured() {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  },

  /**
   * Uploads a resume PDF buffer directly to Cloudinary.
   * Uses resource_type = raw because resumes are PDF files.
   * 
   * @param {Object} file - Express multer file object
   * @returns {Promise<Object>} Upload metadata including secure_url and public_id
   */
  uploadResume(file) {
    return new Promise((resolve, reject) => {
      if (!this.isConfigured()) {
        return reject(new Error('Cloudinary is not configured on this host (missing credentials)'));
      }

      if (!file || !file.buffer) {
        return reject(new Error('No file buffer provided for Cloudinary upload'));
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // For raw resource type, keeping .pdf extension in public_id makes it direct-downloadable
      const filename = `resume-${uniqueSuffix}.pdf`;

      const options = {
        folder: 'resume-hub/student-resumes',
        public_id: filename,
        resource_type: 'raw'
      };

      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          console.error('Cloudinary stream upload failed:', error);
          return reject(error);
        }
        
        console.log('Cloudinary upload successful:', result.secure_url);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          original_filename: file.originalname
        });
      });

      // Stream file buffer to Cloudinary API
      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream._read = () => {};
      readableStream.push(file.buffer);
      readableStream.push(null);
      
      readableStream.pipe(uploadStream);
    });
  },

  /**
   * Deletes a file from Cloudinary.
   * 
   * @param {string} publicId - Cloudinary public ID of the file
   * @returns {Promise<Object>} Response from Cloudinary API
   */
  async deleteResume(publicId) {
    if (!publicId) {
      console.log('No Cloudinary public ID provided, skipping deletion');
      return null;
    }
    
    try {
      console.log(`Attempting to delete Cloudinary file: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      console.log(`Cloudinary deletion completed:`, result);
      return result;
    } catch (error) {
      console.error(`Failed to delete Cloudinary file ${publicId}:`, error);
      throw error;
    }
  }
};

module.exports = cloudinaryService;
