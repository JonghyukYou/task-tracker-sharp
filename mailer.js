const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn('[mailer] RESEND_API_KEY가 설정되지 않았습니다. 이메일 발송이 동작하지 않을 수 있습니다.');
}

const resend = new Resend(resendApiKey);

/**
 * 이메일 인증 코드 발송
 * @param {string} to 수신자 이메일
 * @param {string} code 인증 코드 (6자리 등)
 */
async function sendVerificationEmail(to, code) {
  const from = process.env.MAIL_FROM || 'Task Tracker <noreply@example.com>';

  // 안전장치: API 키 없으면 아예 에러 던지기
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: 'Task Tracker 이메일 인증 코드',
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <p>Task Tracker 이메일 인증 코드입니다.</p>
          <p style="font-size: 18px; font-weight: bold; letter-spacing: 0.1em;">
            ${code}
          </p>
          <p style="font-size: 13px; color: #555;">
            이 코드는 15분 동안만 유효합니다.
          </p>
        </div>
      `,
      text: `Task Tracker 이메일 인증 코드: ${code} (15분간 유효)`,
    });

    console.log('[mailer] Resend 응답:', result);
  } catch (err) {
    console.error('[mailer] Resend 메일 발송 실패:', err);
    throw err; // 호출한 쪽에서 에러 처리
  }
}

module.exports = {
  sendVerificationEmail,
};