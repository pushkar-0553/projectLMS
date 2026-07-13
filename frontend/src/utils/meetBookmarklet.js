// Google Meet Participant Extractor Bookmarklet
// Copy this code and create a bookmark with it as the URL

const bookmarkletCode = `
javascript:(function(){
  if (!window.location.hostname.includes('meet.google.com')) {
    alert('Please run this on Google Meet');
    return;
  }

  const MeetExtractor = {
    participants: new Set(),
    isRunning: false,
    interval: null,

    init() {
      this.createUI();
    },

    createUI() {
      // Remove existing UI
      const existing = document.getElementById('meet-extractor-ui');
      if (existing) existing.remove();

      // Create UI
      const ui = document.createElement('div');
      ui.id = 'meet-extractor-ui';
      ui.innerHTML = \`
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          z-index: 10000;
          width: 400px;
          max-height: 600px;
          font-family: 'Google Sans', Arial, sans-serif;
        ">
          <div style="
            background: #1a73e8;
            color: white;
            padding: 16px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <h3 style="margin: 0; font-size: 18px;">Meet Participant Extractor</h3>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
              background: none;
              border: none;
              color: white;
              font-size: 24px;
              cursor: pointer;
            ">×</button>
          </div>
          
          <div style="padding: 20px;">
            <div id="extractor-status" style="
              text-align: center;
              padding: 20px;
              color: #5f6368;
            ">
              Ready to extract participants
            </div>
            
            <div id="participants-display" style="
              max-height: 300px;
              overflow-y: auto;
              margin: 20px 0;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 8px;
            "></div>
            
            <div style="display: flex; gap: 10px;">
              <button id="start-btn" style="
                flex: 1;
                background: #1a73e8;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
              ">Start Extraction</button>
              
              <button id="stop-btn" style="
                flex: 1;
                background: #ea4335;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
              ">Stop & Copy</button>
            </div>
          </div>
        </div>
      \`;
      
      document.body.appendChild(ui);
      
      // Add event listeners
      document.getElementById('start-btn').onclick = () => this.start();
      document.getElementById('stop-btn').onclick = () => this.stopAndCopy();
    },

    start() {
      this.isRunning = true;
      this.participants.clear();
      
      document.getElementById('extractor-status').innerHTML = \`
        <div style="color: #1a73e8;">
          <div style="font-size: 20px;">Extracting...</div>
          <div style="font-size: 14px;">Monitoring for participants</div>
        </div>
      \`;

      // Extract every 2 seconds
      this.interval = setInterval(() => this.extract(), 2000);
      this.extract(); // Initial extraction
    },

    extract() {
      try {
        // Try different methods to find participants
        const selectors = [
          '[data-participant-id]',
          '[data-self-name]',
          '.zWfAib',
          '.uGJ1ub',
          '[role="listitem"]',
          '[aria-label*="participant"]'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const name = this.getName(element);
            if (name && name.length > 2) {
              this.participants.add(name);
            }
          });
        });

        // Try people panel
        const peoplePanel = document.querySelector('[role="dialog"], [data-panel-id]');
        if (peoplePanel) {
          const text = peoplePanel.textContent;
          const names = this.parseNames(text);
          names.forEach(name => this.participants.add(name));
        }

        this.updateDisplay();

      } catch (error) {
        console.error('Extraction error:', error);
      }
    },

    getName(element) {
      let name = element.getAttribute('data-self-name') || 
                 element.getAttribute('data-participant-name') ||
                 element.getAttribute('aria-label') ||
                 element.textContent ||
                 element.innerText;

      if (name) {
        name = name.trim();
        name = name.replace(/\\(.*\\)/g, '');
        name = name.replace(/^\\d+\\.\\s*/, '');
        name = name.replace(/^\\-\\s*/, '');
        name = name.replace(/^(You|Me)\\s+/i, '');
        name = name.replace(/\\s+(is speaking|has joined|has left).*$/i, '');
      }

      return name || '';
    },

    parseNames(text) {
      const names = [];
      const lines = text.split('\\n').filter(line => line.trim());
      
      lines.forEach(line => {
        const nameMatches = line.match(/^[A-Za-z\\s]{2,50}$/);
        if (nameMatches) {
          const name = nameMatches[0].trim();
          if (name.length > 2 && !name.toLowerCase().includes('you')) {
            names.push(name);
          }
        }
      });

      return names;
    },

    updateDisplay() {
      const display = document.getElementById('participants-display');
      const participants = Array.from(this.participants);
      
      display.innerHTML = \`
        <div style="color: #5f6368; margin-bottom: 10px;">
          Found \${participants.length} participants:
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          \${participants.map(name => \`
            <span style="
              background: #e8f0fe;
              color: #1a73e8;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 500;
            ">\${name}</span>
          \`).join('')}
        </div>
      \`;
    },

    stopAndCopy() {
      this.isRunning = false;
      if (this.interval) clearInterval(this.interval);

      const participants = Array.from(this.participants);
      const text = participants.join('\\n');
      
      // Copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        document.getElementById('extractor-status').innerHTML = \`
          <div style="color: #34a853;">
            <div style="font-size: 20px;">Copied!</div>
            <div style="font-size: 14px;">\${participants.length} participants copied</div>
            <div style="font-size: 12px; margin-top: 10px;">
              Paste in your LMS attendance section
            </div>
          </div>
        \`;
        
        setTimeout(() => {
          document.getElementById('meet-extractor-ui').remove();
        }, 3000);
      });
    }
  };

  MeetExtractor.init();
})();
`;

// Create bookmarklet instructions
console.log(`
=== GOOGLE MEET PARTICIPANT EXTRACTOR BOOKMARKLET ===

To create the bookmarklet:

1. Copy the code below (everything between the === markers)
2. Right-click your browser's bookmarks bar
3. Select "Add Page" or "Bookmark This Page"
4. Name it: "Meet Extractor"
5. Paste the code as the URL
6. Save

To use:
1. Open Google Meet
2. Click the "Meet Extractor" bookmark
3. Click "Start Extraction"
4. When done, click "Stop & Copy"
5. Paste in your LMS attendance section

BOOKMARKLET CODE:
${bookmarkletCode}
`);

export { bookmarkletCode };
