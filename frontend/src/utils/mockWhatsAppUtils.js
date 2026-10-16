/**
 * Utilities and template engine for Mock Interview WhatsApp notifications
 */

export const DEFAULT_MOCK_WA_TEMPLATE = `Hello {{student_name}},

Regarding your upcoming mock interview for "{{mock_title}}" on {{interview_date}}:

{{slot_info}}
{{meet_link}}

Please be prepared on time. Best regards!`;

export const MOCK_WA_PRESETS = [
  {
    id: 'standard',
    title: 'Standard Slot & Meet Link',
    description: 'Clean default with candidate slot and Google Meet link',
    template: `Hello {{student_name}},

Regarding your upcoming mock interview for "{{mock_title}}" on {{interview_date}}:

{{slot_info}}
{{meet_link}}

Please be prepared on time. Best regards!`
  },
  {
    id: 'starting_soon',
    title: 'Starting Soon / Urgent Join',
    description: 'Direct alert for candidates whose slot is right now',
    template: `Hello {{student_name}},

Your mock interview for "{{mock_title}}" is starting soon!

Your Slot: {{slot_time}}
Meeting Link: {{meet_url}}

Please join the meeting room immediately.`
  },
  {
    id: 'concise',
    title: 'Short & Direct',
    description: 'Brief reminder with essential time and link',
    template: `Hi {{student_name}}, your mock interview for {{mock_title}} is set for {{interview_date}} at {{slot_time}}.

Meeting Link: {{meet_url}}

All the best!`
  }
];

export const MOCK_WA_PLACEHOLDERS = [
  { tag: '{{student_name}}', label: 'Candidate Name', sample: 'Rahul Sharma' },
  { tag: '{{mock_title}}', label: 'Drive Title', sample: 'Full Stack Mock Interview' },
  { tag: '{{interview_date}}', label: 'Drive Date', sample: '2026-10-20' },
  { tag: '{{slot_time}}', label: 'Slot (e.g. 10:00 to 10:20)', sample: '10:00 to 10:20' },
  { tag: '{{slot_info}}', label: 'Full Slot Text', sample: 'Scheduled Slot: 10:00 to 10:20' },
  { tag: '{{meet_link}}', label: 'Meet Link Text', sample: 'Meet Link: https://meet.google.com/abc-defg-hij' },
  { tag: '{{meet_url}}', label: 'Raw Meet URL', sample: 'https://meet.google.com/abc-defg-hij' },
  { tag: '{{batch_name}}', label: 'Batch Name', sample: 'Batch A - Morning' },
  { tag: '{{course_name}}', label: 'Course Name', sample: 'Full Stack Web Development' }
];

/**
 * Normalizes phone number to international WhatsApp format (defaults to +91 India for 10-digit numbers)
 */
export const normalizeMockPhone = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

/**
 * Replaces placeholders in message template with real candidate & event details
 */
export const formatMockWhatsAppMessage = (template, student = {}, mockEvent = {}) => {
  if (!template) template = DEFAULT_MOCK_WA_TEMPLATE;

  const studentName = student.student_name || student.name || 'Candidate';
  const mockTitle = mockEvent.title || 'Mock Interview';
  const interviewDate = mockEvent.interview_date || 'scheduled date';

  const slotTime = student.scheduled_start
    ? `${student.scheduled_start} to ${student.scheduled_end}`
    : 'To be announced';

  const slotInfo = student.scheduled_start
    ? `Scheduled Slot: ${student.scheduled_start} to ${student.scheduled_end}`
    : 'Interview slot details will be shared shortly.';

  const meetUrl = mockEvent.meet_link || '';
  const meetLink = meetUrl ? `Meet Link: ${meetUrl}` : '';
  const batchName = student.batch_name || 'General';
  const courseName = mockEvent.course_name || '';

  let message = template;

  const replacements = {
    '{{student_name}}': studentName,
    '{{name}}': studentName,
    '{{mock_title}}': mockTitle,
    '{{title}}': mockTitle,
    '{{interview_date}}': interviewDate,
    '{{date}}': interviewDate,
    '{{slot_time}}': slotTime,
    '{{slot}}': slotTime,
    '{{slot_info}}': slotInfo,
    '{{meet_link}}': meetLink,
    '{{meet_url}}': meetUrl,
    '{{batch_name}}': batchName,
    '{{batch}}': batchName,
    '{{course_name}}': courseName,
    '{{course}}': courseName
  };

  Object.entries(replacements).forEach(([tag, val]) => {
    message = message.split(tag).join(val || '');
  });

  return message;
};

/**
 * Builds direct WhatsApp URL with customized text
 */
export const generateMockWhatsAppLink = (rawPhone, template, student, mockEvent) => {
  const phone = normalizeMockPhone(rawPhone);
  if (!phone) return '#';
  const formattedText = formatMockWhatsAppMessage(template, student, mockEvent);
  return `https://wa.me/${phone}?text=${encodeURIComponent(formattedText)}`;
};
