const GSI_CLIENT_URL = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let gsiLoadedPromise = null;

/**
 * Dynamically load Google Identity Services GSI Client
 */
const loadGsiClient = () => {
  if (gsiLoadedPromise) return gsiLoadedPromise;
  
  gsiLoadedPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_CLIENT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services SDK failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Google Identity Services SDK failed to load'));
    document.head.appendChild(script);
  });
  
  return gsiLoadedPromise;
};

class GoogleOAuthService {
  constructor() {
    this.accessToken = localStorage.getItem('google_access_token') || null;
    this.tokenExpiry = localStorage.getItem('google_token_expiry') || null;
  }

  /**
   * Fetch cached OAuth token from LocalStorage, checking if it is still valid
   */
  getStoredToken() {
    if (this.accessToken && this.tokenExpiry) {
      const now = new Date().getTime();
      // Use 5 minutes buffer to prevent token expiring mid-upload
      if (now < Number(this.tokenExpiry)) {
        return this.accessToken;
      }
    }
    this.clearStoredToken();
    return null;
  }

  /**
   * Save token details and expiry to LocalStorage
   */
  storeToken(token, expiresInSeconds) {
    const expiryTime = new Date().getTime() + (expiresInSeconds - 300) * 1000;
    this.accessToken = token;
    this.tokenExpiry = expiryTime.toString();
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_token_expiry', expiryTime.toString());
  }

  /**
   * Clear active OAuth tokens
   */
  clearStoredToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
  }

  /**
   * Resolve an active Google Access Token. Tries reading cache first, 
   * fallback to initiating accounts selection popup.
   */
  async getAccessToken() {
    const existingToken = this.getStoredToken();
    if (existingToken) return existingToken;

    await loadGsiClient();

    if (!CLIENT_ID) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not configured in the frontend environment variables (.env)');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file', // Access only files created by this app
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              this.storeToken(response.access_token, response.expires_in || 3600);
              resolve(response.access_token);
            } else {
              reject(new Error('Authentication failed: No access token was returned'));
            }
          },
          error_callback: (err) => {
            reject(new Error(err?.message || 'OAuth authentication process encountered an error'));
          }
        });
        
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const googleOAuthService = new GoogleOAuthService();
