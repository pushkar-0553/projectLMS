/**
 * HTTP-based Email Sender
 * Designed specifically for cloud hosting environments like Render, AWS Lambda, or Vercel
 * where outbound SMTP ports (25, 465, 587) are blocked by default.
 * 
 * Uses standard HTTPS (Port 443), which is always open and never blocked.
 * Supports Resend, Brevo (Sendinblue), SendGrid, and generic HTTP relays.
 */

/**
 * Determine if account or environment is configured for HTTP email dispatch
 */
function isHttpEmailConfigured(smtpAcc = {}) {
  const host = (smtpAcc.host || '').toLowerCase();
  const secureType = (smtpAcc.secure_type || '').toUpperCase();
  const pass = (smtpAcc.plainPassword || '').trim();

  if (secureType === 'HTTPS' || secureType === 'REST_API') return true;
  if (host.includes('resend') || host.includes('brevo') || host.includes('sendgrid') || host.startsWith('http')) return true;
  if (pass.startsWith('re_') || pass.startsWith('xkeysib-') || pass.startsWith('SG.')) return true;
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_HTTP_RELAY_URL) return true;

  return false;
}

/**
 * Send email via Resend API (HTTPS Port 443)
 */
async function sendViaResend({ apiKey, fromEmail, fromName, toEmail, toName, subject, html }) {
  const sender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: sender,
      to: [toEmail],
      subject,
      html
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend API Error (${res.status}): ${data.message || JSON.stringify(data)}`);
  }
  return { id: data.id, provider: 'Resend (HTTPS)', response: `Delivered via Resend (ID: ${data.id})` };
}

/**
 * Send email via Brevo / Sendinblue API (HTTPS Port 443)
 */
async function sendViaBrevo({ apiKey, fromEmail, fromName, toEmail, toName, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: fromName || 'Examination Portal', email: fromEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent: html
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Brevo API Error (${res.status}): ${data.message || JSON.stringify(data)}`);
  }
  return { id: data.messageId, provider: 'Brevo (HTTPS)', response: `Delivered via Brevo (MessageId: ${data.messageId})` };
}

/**
 * Send email via SendGrid API (HTTPS Port 443)
 */
async function sendViaSendGrid({ apiKey, fromEmail, fromName, toEmail, toName, subject, html }) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: toEmail, name: toName }]
      }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SendGrid API Error (${res.status}): ${errText}`);
  }
  return { provider: 'SendGrid (HTTPS)', response: 'Delivered via SendGrid' };
}

/**
 * Main dispatcher for HTTPS email delivery
 */
async function sendEmailViaHttp({
  smtpAcc = {},
  plainPassword = '',
  toEmail,
  toName = '',
  subject,
  html
}) {
  const host = (smtpAcc.host || '').toLowerCase();
  const pass = (plainPassword || '').trim();
  const fromEmail = smtpAcc.sender_email || process.env.SENDER_EMAIL || 'notifications@resend.dev';
  const fromName = smtpAcc.display_name || 'LMS Examination Portal';

  // 1. Check for Resend
  const resendKey = process.env.RESEND_API_KEY || (pass.startsWith('re_') ? pass : null) || (host.includes('resend') ? pass : null);
  if (resendKey) {
    return await sendViaResend({
      apiKey: resendKey,
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      html
    });
  }

  // 2. Check for Brevo
  const brevoKey = process.env.BREVO_API_KEY || (pass.startsWith('xkeysib-') ? pass : null) || (host.includes('brevo') ? pass : null);
  if (brevoKey) {
    return await sendViaBrevo({
      apiKey: brevoKey,
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      html
    });
  }

  // 3. Check for SendGrid
  const sendgridKey = process.env.SENDGRID_API_KEY || (pass.startsWith('SG.') ? pass : null) || (host.includes('sendgrid') ? pass : null);
  if (sendgridKey) {
    return await sendViaSendGrid({
      apiKey: sendgridKey,
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      html
    });
  }

  // 4. Check for Custom Webhook / Relay URL
  const relayUrl = process.env.SMTP_HTTP_RELAY_URL || (host.startsWith('http') ? host : null);
  if (relayUrl) {
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pass}`
      },
      body: JSON.stringify({
        from: fromEmail,
        fromName,
        to: toEmail,
        toName,
        subject,
        html
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP Email Relay Error (${res.status}): ${err}`);
    }
    return { provider: 'Custom HTTP Relay (HTTPS)', response: 'Delivered via HTTP Relay' };
  }

  throw new Error('No HTTP email provider key found (Configure RESEND_API_KEY or BREVO_API_KEY to bypass Render SMTP port blocks).');
}

/**
 * Verify HTTP email configuration
 */
async function testHttpConnection({ smtpAcc = {}, plainPassword = '' }) {
  const host = (smtpAcc.host || '').toLowerCase();
  const pass = (plainPassword || '').trim();

  // Test Resend API key
  const resendKey = process.env.RESEND_API_KEY || (pass.startsWith('re_') ? pass : null) || (host.includes('resend') ? pass : null);
  if (resendKey) {
    const res = await fetch('https://api.resend.com/api-keys', {
      headers: { 'Authorization': `Bearer ${resendKey}` }
    });
    if (res.ok) {
      return { success: true, message: 'Resend HTTPS API connection verified! Emails will send reliably on Render over port 443.' };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend validation failed: ${err.message || res.statusText}`);
  }

  // Test Brevo API key
  const brevoKey = process.env.BREVO_API_KEY || (pass.startsWith('xkeysib-') ? pass : null) || (host.includes('brevo') ? pass : null);
  if (brevoKey) {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': brevoKey }
    });
    if (res.ok) {
      const acc = await res.json();
      return { success: true, message: `Brevo HTTPS API connection verified (${acc.email})! Emails will send reliably on Render over port 443.` };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo validation failed: ${err.message || res.statusText}`);
  }

  throw new Error('Provide a valid Resend (re_...) or Brevo (xkeysib-...) API key for HTTPS email delivery.');
}

module.exports = {
  isHttpEmailConfigured,
  sendEmailViaHttp,
  testHttpConnection
};
