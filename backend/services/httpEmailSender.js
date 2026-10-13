/**
 * Legacy HTTP Email Sender wrapper
 * Maintained for backward compatibility. Delegates directly to emailProvider.js.
 */
const { 
  isEmailProviderConfigured, 
  sendEmail, 
  testEmailProviderConnection 
} = require('./emailProvider');

module.exports = {
  isHttpEmailConfigured: isEmailProviderConfigured,
  sendEmailViaHttp: ({ toEmail, toName, subject, html, fromEmail, fromName }) =>
    sendEmail({ to: toEmail, toName, subject, html, fromEmail, fromName }),
  testHttpConnection: () => testEmailProviderConnection()
};
