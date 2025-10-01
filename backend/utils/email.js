const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

const sendRegistrationEmail = async (user) => {
  const subject = 'Welcome to Leads Manager';
  const html = `
    <h1>Welcome to Leads Manager!</h1>
    <p>Hello ${user.name},</p>
    <p>Your account has been created successfully.</p>
    <p>You can now login to the system using your credentials.</p>
    <p>Role: ${user.role}</p>
    <br>
    <p>Best regards,<br>Leads Manager Team</p>
  `;

  await sendEmail(user.email, subject, html);
};

const sendLeadAssignmentEmail = async (user, lead) => {
  const subject = 'New Lead Assigned';
  const html = `
    <h1>New Lead Assigned</h1>
    <p>Hello ${user.name},</p>
    <p>A new lead has been assigned to you:</p>
    <ul>
      <li><strong>Company:</strong> ${lead.companyTradingName || `${lead.name} ${lead.surname}`}</li>
      <li><strong>Contact:</strong> ${lead.emailAddress || 'N/A'}</li>
      <li><strong>Phone:</strong> ${lead.mobileNumber || lead.telephoneNumber || 'N/A'}</li>
    </ul>
    <p>Please follow up with the lead as soon as possible.</p>
    <br>
    <p>Best regards,<br>Leads Manager Team</p>
  `;

  await sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendLeadAssignmentEmail
};