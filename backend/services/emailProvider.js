/**
 * Email Provider Abstraction Layer
 * Dispatches transactional emails via HTTPS (Port 443) using the Brevo HTTP API.
 * 
 * Bypasses cloud hosting outbound SMTP port blocks (Render Free / AWS / Vercel).
 * Does not use Nodemailer or SMTP connections (ports 25, 465, 587).
 */

class EmailDeliveryError extends Error {
  constructor(message, isPermanent = false, statusCode = null, code = null) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.isPermanent = Boolean(isPermanent);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Validates and resolves the verified Brevo sender identity.
 * Prevents arbitrary unverified database emails from being rejected by Brevo.
 */
function getSenderIdentity(overrideFromEmail, overrideFromName) {
  const defaultEmail = (process.env.EMAIL_FROM_ADDRESS || process.env.SENDER_EMAIL || '').trim();
  const defaultName = (process.env.EMAIL_FROM_NAME || 'LMS Examination Portal').trim();

  // Allow comma-separated list of verified senders or default to primary verified address
  const verifiedList = (process.env.VERIFIED_SENDER_EMAILS || defaultEmail)
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  let senderEmail = defaultEmail;
  if (overrideFromEmail && verifiedList.includes(overrideFromEmail.trim().toLowerCase())) {
    senderEmail = overrideFromEmail.trim();
  }

  const senderName = overrideFromName || defaultName;
  return { senderEmail, senderName };
}

/**
 * Check if the email provider (Brevo) is properly configured in environment
 */
function isEmailProviderConfigured() {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.EMAIL_FROM_ADDRESS || process.env.SENDER_EMAIL || '').trim();
  return Boolean(apiKey && senderEmail);
}

/**
 * Send an email using the Brevo HTTPS REST API (Port 443)
 */
async function sendViaBrevo({ apiKey, senderEmail, senderName, to, toName, subject, html }) {
  if (!apiKey) {
    throw new EmailDeliveryError('BREVO_API_KEY is not configured in backend environment variables.', true);
  }
  if (!senderEmail) {
    throw new EmailDeliveryError('EMAIL_FROM_ADDRESS is not configured. A verified Brevo sender email is required.', true);
  }
  if (!to) {
    throw new EmailDeliveryError('Recipient email address is required.', true);
  }

  const payload = {
    sender: {
      name: senderName || 'LMS Examination Portal',
      email: senderEmail
    },
    to: [
      {
        email: to.trim(),
        name: (toName || to).trim()
      }
    ],
    subject: subject || 'Examination Notification',
    htmlContent: html
  };

  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000) // 15-second timeout for cloud reliability
    });
  } catch (netErr) {
    const isTimeout = netErr.name === 'TimeoutError' || /timeout/i.test(netErr.message);
    throw new EmailDeliveryError(
      `Brevo HTTPS request failed: ${isTimeout ? 'Request timed out after 15s' : netErr.message}`,
      false, // Network errors are temporary and can be retried
      null,
      isTimeout ? 'ETIMEDOUT' : 'NETWORK_ERROR'
    );
  }

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const statusCode = response.status;
    const errorMsg = responseData.message || JSON.stringify(responseData) || response.statusText;
    const errorCode = responseData.code || 'UNKNOWN_BREVO_ERROR';

    // Error classification:
    // 400: Bad Request (Invalid parameters, invalid recipient, unverified sender) => Permanent
    // 401/403: Authentication or account permission failure => Permanent
    // 404: Endpoint not found => Permanent
    // 429: Rate limit exceeded => Temporary (can retry with backoff)
    // 5xx: Brevo internal server error => Temporary (can retry with backoff)
    const isPermanent = statusCode >= 400 && statusCode < 429;

    throw new EmailDeliveryError(
      `Brevo API Error (${statusCode}): ${errorMsg}`,
      isPermanent,
      statusCode,
      errorCode
    );
  }

  return {
    success: true,
    messageId: responseData.messageId || 'accepted',
    provider: 'Brevo (HTTPS Port 443)',
    response: `Accepted by Brevo (MessageId: ${responseData.messageId || 'n/a'})`
  };
}

/**
 * Universal email dispatch interface
 * Standard signature: sendEmail({ to, toName, subject, html, fromEmail, fromName })
 */
async function sendEmail({ to, toName, subject, html, fromEmail, fromName }) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const { senderEmail, senderName } = getSenderIdentity(fromEmail, fromName);

  return await sendViaBrevo({
    apiKey,
    senderEmail,
    senderName,
    to,
    toName,
    subject,
    html
  });
}

/**
 * Verify Brevo API connection and credentials without sending an email
 */
async function testEmailProviderConnection() {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    throw new EmailDeliveryError('BREVO_API_KEY is missing in backend environment variables.', true);
  }

  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || /timeout/i.test(err.message);
    throw new EmailDeliveryError(
      `Brevo API connectivity test failed: ${isTimeout ? 'Connection timed out' : err.message}`,
      false
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const isPermanent = response.status === 401 || response.status === 403;
    throw new EmailDeliveryError(
      `Brevo API verification failed (${response.status}): ${data.message || response.statusText}`,
      isPermanent,
      response.status
    );
  }

  const { senderEmail } = getSenderIdentity();
  return {
    success: true,
    message: `Brevo HTTPS API connection verified (${data.email})! Emails will dispatch over HTTPS port 443 with zero timeouts.`,
    accountEmail: data.email,
    configuredSender: senderEmail || 'Warning: EMAIL_FROM_ADDRESS not set in .env'
  };
}

module.exports = {
  EmailDeliveryError,
  sendEmail,
  sendViaBrevo,
  getSenderIdentity,
  isEmailProviderConfigured,
  testEmailProviderConnection
};
