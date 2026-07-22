const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class GoogleSheetService {
  /**
   * Request the backend to convert an Excel spreadsheet file on Google Drive into a Google Sheet
   */
  async convertToGoogleSheet({ fileId, accessToken }) {
    const response = await fetch(`${API_BASE_URL}/resume/share/google-drive/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId,
        googleAccessToken: accessToken
      })
    });

    if (!response.ok) {
      let errorMsg = 'Google Sheet conversion failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return await response.json(); // Returns { message, sheetId, sheetLink }
  }
}

export const googleSheetService = new GoogleSheetService();
