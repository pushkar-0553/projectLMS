const GAPI_URL = 'https://apis.google.com/js/api.js';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let gapiLoadedPromise = null;

/**
 * Dynamically load Google API client library
 */
const loadGapiClient = () => {
  if (gapiLoadedPromise) return gapiLoadedPromise;

  gapiLoadedPromise = new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GAPI_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return gapiLoadedPromise;
};

/**
 * Initialize GAPI picker library
 */
const initPicker = () => {
  return new Promise((resolve, reject) => {
    window.gapi.load('picker', {
      callback: resolve,
      onerror: () => reject(new Error('Failed to load Google Picker library'))
    });
  });
};

class GoogleDriveService {
  /**
   * Launch a Google Drive folder picker dialog.
   * Returns selected folder information or null if cancelled.
   */
  async showFolderPicker(accessToken) {
    await loadGapiClient();
    await initPicker();

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    if (!apiKey) {
      throw new Error('VITE_GOOGLE_API_KEY is not configured in the frontend environment variables (.env)');
    }

    return new Promise((resolve, reject) => {
      try {
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS);
        view.setMimeTypes('application/vnd.google-apps.folder');
        view.setSelectFolderEnabled(true);

        const picker = new window.google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setAppId(clientId)
          .setCallback((data) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const doc = data.docs[0];
              resolve({
                id: doc.id,
                name: doc.name,
                url: doc.url
              });
            } else if (data.action === window.google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();

        picker.setVisible(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send the generated Excel blob to the backend to upload it to the user's Google Drive.
   */
  async uploadExcel({ fileBlob, fileName, accessToken, folderId }) {
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('fileName', fileName);
    if (folderId) {
      formData.append('folderId', folderId);
    }
    formData.append('googleAccessToken', accessToken);

    const response = await fetch(`${API_BASE_URL}/resume/share/google-drive/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errorMsg = 'Upload to Google Drive failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return await response.json(); // Returns { message, fileId, driveLink, webContentLink }
  }
}

export const googleDriveService = new GoogleDriveService();
