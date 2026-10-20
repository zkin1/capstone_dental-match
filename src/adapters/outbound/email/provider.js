const GmailAdapter = require('./gmail.adapter');
const ResendAdapter = require('./resend.adapter');

module.exports = function createEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  if (provider === 'gmail') return new GmailAdapter();
  if (provider === 'resend') return new ResendAdapter();
  throw new Error('EMAIL_PROVIDER debe ser gmail o resend');
};
