/**
 * Base class defining the interface for all cloud storage providers.
 * This makes the system future-ready for Microsoft OneDrive, Dropbox, Box, SharePoint, etc.
 */
class StorageProvider {
  /**
   * Upload file to storage
   * @param {Object} params
   * @param {Buffer} params.fileBuffer - Binary buffer of the file
   * @param {string} params.fileName - Name of the file to save
   * @param {string} params.accessToken - OAuth Access Token
   * @param {string} [params.folderId] - Destination folder ID
   * @returns {Promise<{fileId: string, viewLink: string, webContentLink?: string}>}
   */
  async uploadFile({ fileBuffer, fileName, accessToken, folderId }) {
    throw new Error('uploadFile method must be implemented');
  }

  /**
   * Convert file to native spreadsheet format
   * @param {Object} params
   * @param {string} params.fileId - Source file ID
   * @param {string} params.accessToken - OAuth Access Token
   * @returns {Promise<{sheetId: string, sheetLink: string}>}
   */
  async convertToSpreadsheet({ fileId, accessToken }) {
    throw new Error('convertToSpreadsheet method must be implemented');
  }
}

/**
 * Google Drive implementation of StorageProvider
 */
class GoogleDriveProvider extends StorageProvider {
  /**
   * Upload file to Google Drive using multipart upload
   */
  async uploadFile({ fileBuffer, fileName, accessToken, folderId }) {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const metadataPart = JSON.stringify(metadata);
    
    // Construct multipart body using binary buffers to preserve spreadsheet bytes
    const header = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}${delimiter}Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const footer = `${closeDelimiter}`;
    
    const multipartBody = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      fileBuffer,
      Buffer.from(footer, 'utf-8')
    ]);

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString()
      },
      body: multipartBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to upload file to Google Drive';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {}
      throw new Error(`${errorMessage} (Status ${response.status})`);
    }

    const data = await response.json();
    return {
      fileId: data.id,
      viewLink: data.webViewLink,
      webContentLink: data.webContentLink
    };
  }

  /**
   * Convert uploaded Excel file to Google Sheet by copying it with Spreadsheet MIME type
   */
  async convertToSpreadsheet({ fileId, accessToken }) {
    // 1. Fetch file name first to keep the same name for the Google Sheet
    const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`;
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let sheetName = 'Candidates_Report';
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sheetName = fileData.name.replace(/\.xlsx$/i, '');
    }

    // 2. Make a copy of the file and convert it to Google Sheets
    const copyUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name,webViewLink`;
    const copyResponse = await fetch(copyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mimeType: 'application/vnd.google-apps.spreadsheet',
        name: sheetName
      })
    });

    if (!copyResponse.ok) {
      const errorText = await copyResponse.text();
      let errorMessage = 'Failed to convert file to Google Sheet';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {}
      throw new Error(`${errorMessage} (Status ${copyResponse.status})`);
    }

    const data = await copyResponse.json();
    return {
      sheetId: data.id,
      sheetLink: data.webViewLink
    };
  }
}

/**
 * Storage Service Manager to register and retrieve storage providers.
 */
class StorageService {
  constructor() {
    this.providers = {};
  }

  registerProvider(name, provider) {
    this.providers[name] = provider;
  }

  getProvider(name) {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Storage provider '${name}' is not registered`);
    }
    return provider;
  }
}

const storageService = new StorageService();

// Register the Google Drive provider
storageService.registerProvider('google-drive', new GoogleDriveProvider());

module.exports = {
  storageService,
  StorageProvider
};
