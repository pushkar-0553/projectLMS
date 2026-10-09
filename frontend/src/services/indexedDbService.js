const DB_NAME = 'ExamVault_OfflineDB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Initialize IndexedDB database and object stores
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('answers')) {
        const answerStore = db.createObjectStore('answers', { keyPath: 'compositeKey' });
        answerStore.createIndex('by_session', 'sessionToken', { unique: false });
        answerStore.createIndex('by_synced', ['sessionToken', 'isSynced'], { unique: false });
      }

      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'sessionToken' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Database open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

export const indexedDbService = {
  /**
   * Save or update an answer instantaneously in IndexedDB
   */
  async saveAnswerLocally(sessionToken, questionId, answerText = null, selectedOption = null, version = 1) {
    try {
      const db = await openDB();
      const compositeKey = `${sessionToken}_${questionId}`;
      const record = {
        compositeKey,
        sessionToken,
        questionId,
        answerText,
        selectedOption,
        version,
        clientUpdatedAt: new Date().toISOString(),
        isSynced: false
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction('answers', 'readwrite');
        const store = tx.objectStore('answers');
        const req = store.put(record);

        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Fallback write error:', err.message);
      return null;
    }
  },

  /**
   * Get all answers stored locally for a specific exam session
   */
  async getAllLocalAnswers(sessionToken) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('answers', 'readonly');
        const store = tx.objectStore('answers');
        const index = store.index('by_session');
        const req = index.getAll(IDBKeyRange.only(sessionToken));

        req.onsuccess = () => {
          const answersMap = {};
          (req.result || []).forEach(ans => {
            answersMap[ans.questionId] = ans;
          });
          resolve(answersMap);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Read error:', err.message);
      return {};
    }
  },

  /**
   * Get list of unsynced answers ready for server autosave dispatch
   */
  async getUnsyncedAnswers(sessionToken) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('answers', 'readonly');
        const store = tx.objectStore('answers');
        const index = store.index('by_session');
        const req = index.getAll(IDBKeyRange.only(sessionToken));

        req.onsuccess = () => {
          const unsynced = (req.result || []).filter(item => !item.isSynced);
          resolve(unsynced);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return [];
    }
  },

  /**
   * Mark local answers as successfully confirmed and synced with the backend
   */
  async markAnswersAsSynced(sessionToken, questionIds) {
    try {
      const db = await openDB();
      const tx = db.transaction('answers', 'readwrite');
      const store = tx.objectStore('answers');

      for (const qId of questionIds) {
        const compositeKey = `${sessionToken}_${qId}`;
        const getReq = store.get(compositeKey);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = { ...getReq.result, isSynced: true };
            store.put(updated);
          }
        };
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('[IndexedDB] Sync mark error:', err.message);
      return false;
    }
  },

  /**
   * Save active session metadata locally for crash and reload recovery
   */
  async saveSession(sessionData) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        const store = tx.objectStore('sessions');
        const req = store.put(sessionData);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return false;
    }
  },

  /**
   * Get cached session metadata by sessionToken
   */
  async getSession(sessionToken) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const req = store.get(sessionToken);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return null;
    }
  },

  /**
   * Clear session data from IndexedDB upon successful final submission
   */
  async clearSessionData(sessionToken) {
    try {
      const db = await openDB();
      const tx = db.transaction(['answers', 'sessions'], 'readwrite');
      const answerStore = tx.objectStore('answers');
      const sessionStore = tx.objectStore('sessions');

      sessionStore.delete(sessionToken);

      const index = answerStore.index('by_session');
      const req = index.getAllKeys(IDBKeyRange.only(sessionToken));
      req.onsuccess = () => {
        (req.result || []).forEach(k => answerStore.delete(k));
      };

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      return false;
    }
  }
};
