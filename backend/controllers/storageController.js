const { storageService } = require('../services/storageService');

/**
 * Handle Excel file upload to a cloud storage provider (defaults to Google Drive)
 */
exports.uploadToStorage = async (req, res) => {
  try {
    const { provider = 'google-drive', googleAccessToken, folderId, fileName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded in the request' });
    }

    // Resolve Google OAuth access token from body, custom header, or standard bearer auth header
    const token = googleAccessToken || req.headers['x-google-access-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return res.status(400).json({ message: 'Google OAuth Access Token is required to complete this action' });
    }

    const storageProvider = storageService.getProvider(provider);
    const result = await storageProvider.uploadFile({
      fileBuffer: file.buffer,
      fileName: fileName || file.originalname,
      accessToken: token,
      folderId
    });

    res.json({
      message: 'File uploaded successfully',
      fileId: result.fileId,
      driveLink: result.viewLink,
      webContentLink: result.webContentLink
    });
  } catch (err) {
    console.error('Error uploading file to storage provider:', err);
    res.status(500).json({ message: err.message || 'Failed to complete cloud upload' });
  }
};

/**
 * Convert an uploaded Excel file inside a cloud storage provider to a native Spreadsheet (Google Sheet)
 */
exports.convertToSpreadsheet = async (req, res) => {
  try {
    const { provider = 'google-drive', fileId, googleAccessToken } = req.body;

    // Resolve Google OAuth access token
    const token = googleAccessToken || req.headers['x-google-access-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return res.status(400).json({ message: 'Google OAuth Access Token is required to convert files' });
    }

    if (!fileId) {
      return res.status(400).json({ message: 'Target File ID is required for spreadsheet conversion' });
    }

    const storageProvider = storageService.getProvider(provider);
    const result = await storageProvider.convertToSpreadsheet({
      fileId,
      accessToken: token
    });

    res.json({
      message: 'Spreadsheet conversion completed successfully',
      sheetId: result.sheetId,
      sheetLink: result.sheetLink
    });
  } catch (err) {
    console.error('Error converting file to spreadsheet format:', err);
    res.status(500).json({ message: err.message || 'Failed to complete spreadsheet conversion' });
  }
};
