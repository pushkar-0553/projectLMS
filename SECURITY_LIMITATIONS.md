# 🛡️ Examination Security & Proctoring Limitations

**Document:** Security Boundaries & Proctoring Limitations Specification  
**Application:** Written Examination Platform  
**Target Environment:** Standard Modern Web Browsers (Chrome, Edge, Firefox, Safari)

---

## 1. Technical Controls Implemented by the Platform

The platform enforces multiple layers of browser-level proctoring to deter and detect academic dishonesty:

1. **Fullscreen Enforcement & Departure Tracking:**
   - The assessment requires Fullscreen mode to be initiated upon starting the exam.
   - Any departure from Fullscreen triggers a `fullscreenchange` event, logged immediately to the server with a warning counter.
2. **Window Blur & Tab Switching Detection:**
   - Listens to `window.blur` and `document.visibilitychange` events.
   - Switching tabs, minimizing the window, or activating another application increments the security violation count.
3. **Clipboard Interception:**
   - Intercepts `copy`, `cut`, and `paste` events to prevent copying questions out or pasting pre-written solutions in.
4. **Developer Tools & Shortcut Interception:**
   - Intercepts keyboard shortcuts: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, `Ctrl+S`, `Ctrl+P`.
   - Disables standard right-click context menu.
5. **Server-Enforced Violation Ceiling:**
   - Violations are stored in the database (`exam_security_violations`).
   - Reaching a maximum of **3 violations** immediately locks the exam and triggers automatic submission (`submission_type = 'VIOLATION'`).
6. **In-Exam Tool Isolation:**
   - Monaco code editor, Web Search, and AI Assistant operate within the examination viewport.
   - Links in web search open in an embedded **In-Exam Reader View** proxy to prevent candidate tab switching or window blur events.

---

## 2. Inherent Boundaries & Limitations of Browser-Based Proctoring

No web application running in a standard browser can provide absolute operating-system or physical-environment lockdown. Administrators, coordinators, and evaluators must understand the following technical limitations:

### 2.1 Physical Environment & Secondary Devices
- **Mobile Phones & Tablets:** A browser cannot detect if a candidate uses a smartphone, tablet, or physical textbook placed beside their screen.
- **Secondary Monitors & Dual Displays:** Browsers cannot reliably prevent a candidate from reading content on an external display connected via HDMI/DisplayPort without specialized native software.
- **Third-Party Collaboration:** A browser cannot detect other persons present in the room communicating verbally with the candidate.

### 2.2 Operating System Level Operations
- **Virtual Machines (VMs):** A candidate running the examination inside a VM (e.g. VMware, VirtualBox) can switch focus on their host machine without the VM's browser detecting a tab switch or blur.
- **Hardware Capture Devices:** Hardware HDMI splitters, video capture cards, or external cameras cannot be detected by browser JavaScript.
- **OS-Level Screenshot Tools:** Native OS shortcuts (such as `PrtScn`, `Win+Shift+S`, or macOS `Cmd+Shift+4`) bypass browser keyboard interceptors.

### 2.3 Network-Level Capabilities
- **Secondary Network Interfaces:** A student could perform lookups on another device connected to the same local Wi-Fi network.

---

## 3. Recommended Institutional Best Practices

To achieve optimal exam integrity alongside technical browser controls:
1. **Time-Constrained Assessments:** Design assessments with tight, realistic durations (e.g., 60 minutes for 30 questions) that discourage time spent searching external resources.
2. **Application & Reasoning-Based Questions:** Emphasize conceptual application, code debugging, and analytical questions rather than simple trivia or easily searchable definitions.
3. **Live Human / Video Proctoring:** Combine the platform's browser controls with live video supervision (e.g., Google Meet, Zoom, or in-person exam hall invigilation) when high-stakes certifications are conducted.
