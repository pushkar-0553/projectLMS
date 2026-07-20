/**
 * WhatsApp Helper Utilities for Resume Management
 */

/**
 * Normalizes a phone number to the international format required by WhatsApp Click-to-Chat.
 * - Removes all non-digit characters.
 * - Removes a leading zero if present.
 * - Automatically prepends the Indian country code (91) if it becomes exactly 10 digits.
 * - If already starts with 91 and has 12 digits, leaves it as is.
 * 
 * @param {string} rawPhone - The raw phone number input
 * @returns {string} The normalized phone number in international format
 */
export const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  
  // Remove all characters except digits
  let cleaned = rawPhone.replace(/\D/g, '');
  
  // If the number starts with 0, remove the leading zero
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If exactly 10 digits, automatically prepend '91'
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validates a phone number before opening WhatsApp.
 * - Reject invalid numbers.
 * - Starts with 91 and is exactly 12 digits long.
 * 
 * @param {string} rawPhone - The raw phone number string
 * @returns {object} { isValid: boolean, message?: string, cleaned?: string }
 */
export const validatePhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return { isValid: false, message: 'Invalid phone number.' };
  }

  const normalized = normalizePhoneNumber(rawPhone);

  // Validate starts with 91 and exactly 12 digits long
  const isValid = /^\d+$/.test(normalized) && normalized.startsWith('91') && normalized.length === 12;

  if (!isValid) {
    return { isValid: false, message: 'Invalid phone number.' };
  }

  return { isValid: true, cleaned: normalized };
};

/**
 * Generates the WhatsApp URL.
 * - Format: https://web.whatsapp.com/send?phone={normalizedPhone}&text={encodedMessage}
 * 
 * @param {string} phone - The raw phone number
 * @param {string} message - The message text
 * @returns {string} The formatted URL
 */
export const generateWhatsAppURL = (phone, message) => {
  const normalized = normalizePhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://web.whatsapp.com/send?phone=${normalized}&text=${encodedMessage}`;
};

/**
 * Replaces placeholders in the message template with actual values.
 * Supported placeholders:
 * {{studentName}}, {{phone}}, {{email}}, {{companyName}}, {{interviewDate}},
 * {{interviewTime}}, {{location}}, {{resumeLink}}, {{jobRole}}, {{coordinatorName}}
 * 
 * @param {string} template - The message template
 * @param {object} student - The student object
 * @param {object} metadata - Custom input values (companyName, interviewDate, etc.)
 * @returns {string} The personalized message
 */
export const replaceTemplatePlaceholders = (template, student = {}, metadata = {}) => {
  if (!template) return '';

  const values = {
    studentName: student.name || '',
    phone: student.mobile || student.phone || '',
    email: student.email || '',
    companyName: metadata.companyName || '',
    interviewDate: metadata.interviewDate || '',
    interviewTime: metadata.interviewTime || '',
    location: metadata.location || '',
    resumeLink: student.cloudinary_url || student.resume_url || '',
    jobRole: metadata.jobRole || '',
    coordinatorName: metadata.coordinatorName || ''
  };

  let result = template;
  Object.keys(values).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = values[key];
    // Replace all instances of the placeholder
    result = result.split(placeholder).join(value);
  });

  return result;
};

/**
 * Saves a WhatsApp log event to local history.
 * 
 * @param {object} student - Student details
 * @param {object} user - Current user (sender)
 * @param {string} message - Full message sent
 * @param {string} status - 'Opened in WhatsApp' | 'Cancelled'
 */
export const logWhatsAppEvent = (student, user, message, status) => {
  try {
    const logs = JSON.parse(localStorage.getItem('whatsapp_audit_logs') || '[]');
    
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: student.id || 'N/A',
      studentName: student.name || 'Unknown',
      phoneNumber: normalizePhoneNumber(student.mobile || student.phone) || 'N/A',
      sentBy: user?.name || 'System User',
      role: user?.role || 'admin',
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      messagePreview: message.substring(0, 150) + (message.length > 150 ? '...' : ''),
      status
    };

    logs.unshift(newLog);
    // Limit to 500 logs to prevent local storage overflow
    localStorage.setItem('whatsapp_audit_logs', JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Error logging WhatsApp event:', err);
  }
};

/**
 * Retrieves the local WhatsApp audit logs.
 * @returns {Array} List of logs
 */
export const getWhatsAppLogs = () => {
  try {
    return JSON.parse(localStorage.getItem('whatsapp_audit_logs') || '[]');
  } catch (err) {
    console.error('Error fetching logs:', err);
    return [];
  }
};

/**
 * Clears the WhatsApp audit logs.
 */
export const clearWhatsAppLogs = () => {
  try {
    localStorage.removeItem('whatsapp_audit_logs');
  } catch (err) {
    console.error('Error clearing logs:', err);
  }
};

/**
 * Saves a custom template or recently used message to local storage.
 * @param {string} templateContent - Message content
 * @param {string} templateName - Display name
 */
export const saveRecentTemplate = (templateContent, templateName = 'Custom Message') => {
  if (!templateContent || !templateContent.trim()) return;

  try {
    const recent = JSON.parse(localStorage.getItem('whatsapp_recent_templates') || '[]');
    // Filter out duplicates
    const filtered = recent.filter(t => t.template !== templateContent);
    
    const newEntry = {
      id: `recent_${Date.now()}`,
      name: templateName,
      template: templateContent,
      isRecent: true,
      timestamp: Date.now()
    };

    const updated = [newEntry, ...filtered].slice(0, 10); // Keep last 10
    localStorage.setItem('whatsapp_recent_templates', JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving recent template:', err);
  }
};

/**
 * Fetches recently used templates.
 * @returns {Array} Recently used templates list
 */
export const getRecentTemplates = () => {
  try {
    return JSON.parse(localStorage.getItem('whatsapp_recent_templates') || '[]');
  } catch (err) {
    console.error('Error fetching recent templates:', err);
    return [];
  }
};
