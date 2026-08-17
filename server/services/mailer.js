const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendDigestEmail(toEmail, query, reportText) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #6366f1; margin-top: 0;">Scoutly Scheduled Research Digest</h2>
      <p style="color: #94a3b8; font-size: 14px;"><strong>Topic:</strong> ${query}</p>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 16px 0;" />
      <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
        ${reportText}
      </div>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">
        Automated digest delivered by Scoutly Autonomous Web Research Engine.
      </p>
    </div>
  `;

  return await transporter.sendMail({
    from: `"Scoutly Agent" <${process.env.SMTP_USER || 'noreply@scoutly.ai'}>`,
    to: toEmail,
    subject: `[Scoutly Digest] Research Report: ${query}`,
    html: htmlContent
  });
}

module.exports = { sendDigestEmail };