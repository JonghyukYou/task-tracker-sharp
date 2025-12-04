const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(to, code) {
  const mailOptions = {
    from: `"Task Tracker #" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Task Tracker # 이메일 인증 코드',
    text: `Task Tracker # 이메일 인증 코드: ${code}`,
    html: `<p>Task Tracker # 이메일 인증 코드입니다.</p>
           <p><b style="font-size:18px;">${code}</b></p>
           <p>이 코드는 15분 동안만 유효합니다.</p>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
};