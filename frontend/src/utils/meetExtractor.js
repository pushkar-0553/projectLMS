// Google Meet Participant Extractor
class MeetExtractor {
  constructor() {
    this.isExtracting = false;
    this.participants = [];
    this.extractInterval = null;
  }

  // Start automatic participant extraction
  startExtraction(callback) {
    this.isExtracting = true;
    this.participants = [];
    
    // Check if we're in a Meet window
    if (!window.location.hostname.includes('meet.google.com')) {
      callback({ error: 'Please run this in a Google Meet window' });
      return;
    }

    // Extract participants every 3 seconds
    this.extractInterval = setInterval(() => {
      this.extractParticipants(callback);
    }, 3000);

    // Initial extraction
    this.extractParticipants(callback);
  }

  // Stop extraction
  stopExtraction() {
    this.isExtracting = false;
    if (this.extractInterval) {
      clearInterval(this.extractInterval);
      this.extractInterval = null;
    }
    return this.participants;
  }

  // Extract participants from Meet DOM
  extractParticipants(callback) {
    try {
      const participants = [];
      
      // Method 1: Try to find participant list
      const participantElements = document.querySelectorAll('[data-participant-id], [data-self-name], .zWfAib, .uGJ1ub');
      
      participantElements.forEach(element => {
        const name = this.extractNameFromElement(element);
        if (name && !participants.includes(name)) {
          participants.push(name);
        }
      });

      // Method 2: Try alternative selectors
      if (participants.length === 0) {
        const altElements = document.querySelectorAll('[aria-label*="participant"], [data-i18n="People"]');
        altElements.forEach(element => {
          const text = element.textContent || element.innerText;
          const names = this.parseNamesFromText(text);
          names.forEach(name => {
            if (name && !participants.includes(name)) {
              participants.push(name);
            }
          });
        });
      }

      // Method 3: Try to find in people panel
      if (participants.length === 0) {
        const peoplePanel = document.querySelector('[role="dialog"], [data-panel-id]');
        if (peoplePanel) {
          const names = this.parseNamesFromText(peoplePanel.textContent);
          names.forEach(name => {
            if (name && !participants.includes(name)) {
              participants.push(name);
            }
          });
        }
      }

      // Update participants list
      this.participants = [...new Set([...this.participants, ...participants])];
      
      callback({ 
        success: true, 
        participants: this.participants,
        count: this.participants.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      callback({ error: 'Failed to extract participants', details: error.message });
    }
  }

  // Extract name from DOM element
  extractNameFromElement(element) {
    let name = '';
    
    // Try different attributes
    name = element.getAttribute('data-self-name') || 
           element.getAttribute('data-participant-name') ||
           element.getAttribute('aria-label') ||
           element.textContent ||
           element.innerText;

    if (name) {
      // Clean up the name
      name = name.trim();
      name = name.replace(/\(.*\)/g, ''); // Remove parentheses
      name = name.replace(/^\d+\.\s*/, ''); // Remove numbers
      name = name.replace(/^-\s*/, ''); // Remove bullets
      name = name.replace(/^(You|Me)\s+/i, ''); // Remove You/Me
      name = name.replace(/\s+(is speaking|has joined|has left).*$/i, ''); // Remove status
    }

    return name || '';
  }

  // Parse names from text content
  parseNamesFromText(text) {
    if (!text) return [];
    
    const names = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Look for name patterns
      const nameMatches = line.match(/^[A-Za-z\s]{2,50}$/);
      if (nameMatches) {
        const name = nameMatches[0].trim();
        if (name.length > 2 && !name.toLowerCase().includes('you') && !name.toLowerCase().includes('host')) {
          names.push(name);
        }
      }
    });

    return names;
  }

  // Get current Meet URL
  getMeetUrl() {
    return window.location.href;
  }

  // Check if Meet is active
  isMeetActive() {
    return window.location.hostname.includes('meet.google.com') && 
           document.querySelector('[data-page="1"], [data-panel-id], .uGJ1ub');
  }
}

// Export for use in browser console
window.MeetExtractor = MeetExtractor;

// Auto-start instructions
console.log(`
=== Google Meet Participant Extractor ===
To use this extractor:
1. Open Google Meet in your browser
2. Open browser console (F12)
3. Run: extractor = new MeetExtractor()
4. Run: extractor.startExtraction((data) => console.log(data))
5. When done, run: extractor.stopExtraction()
6. Copy the participants list to your LMS

Note: This works best when the People panel is open.
`);

export default MeetExtractor;
