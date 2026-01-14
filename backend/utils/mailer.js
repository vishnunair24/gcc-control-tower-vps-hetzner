const nodemailer = require('nodemailer');

// Simple mailer abstraction: uses SMTP when configured, otherwise logs to console.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';

let transporter = null;
if (SMTP_HOST && SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

async function sendResetToken(email, token) {
  const link = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/password-set.html?token=${encodeURIComponent(token)}`;
  const subject = 'GCC Control Tower — Set your password';
  const text = `Please set your password by visiting the following link:\n\n${link}\n\nThis link expires in 24 hours.`;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to: email,
        subject,
        text,
        html: `<p>Please set your password by visiting the link below.</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
      });
      console.log('Sent reset email to', email, info.messageId);
      return { sent: true, info };
    } catch (err) {
      console.error('Failed to send reset email', err);
      return { sent: false, error: err };
    }
  }

  // Fallback: log token to server console so admin can copy it in dev
  console.log(`Reset token for ${email}: ${token}\nSet link: ${link}`);
  return { sent: false, info: 'logged' };
}

module.exports = { sendResetToken };
