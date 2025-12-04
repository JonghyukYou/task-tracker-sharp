const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendVerificationEmail } = require('../mailer');

// 닉네임/비밀번호 제한
const USERNAME_MIN = 2;
const USERNAME_MAX = 16;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

// ============================
// 회원가입: POST /api/auth/register
// ============================
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // 1) 기본 유효성 검사
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email, password는 필수입니다.' });
  }

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return res.status(400).json({
      message: `닉네임은 ${USERNAME_MIN}자 이상 ${USERNAME_MAX}자 이하여야 합니다.`,
    });
  }

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return res.status(400).json({
      message: `비밀번호는 ${PASSWORD_MIN}자 이상 ${PASSWORD_MAX}자 이하여야 합니다.`,
    });
  }

  try {
    // 2) 기존 사용자 조회 (이메일/닉네임)
    const existingRes = await pool.query(
      `SELECT id, username, email, email_verified
       FROM users
       WHERE email = $1 OR username = $2`,
      [email, username]
    );
    const existing = existingRes.rows;

    let existingByEmail = null;
    let existingByUsername = null;

    for (const u of existing) {
      if (u.email === email) existingByEmail = u;
      if (u.username === username) existingByUsername = u;
    }

    // 2-1) 이메일이 이미 있고, 인증 완료된 계정인 경우
    if (existingByEmail && existingByEmail.email_verified) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 2-2) 이메일은 새롭지만, 닉네임만 중복인 경우
    if (!existingByEmail && existingByUsername) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    // 비밀번호 해시 & 코드 생성
    const hashed = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15분 후

    let user;

    if (existingByEmail && !existingByEmail.email_verified) {
      // 3) 인증 안 된 기존 이메일 → 재발급 플로우
      const updated = await pool.query(
        `UPDATE users
         SET username = $1,         -- 닉네임도 최신 값으로 덮어쓸 수 있음
             password_hash = $2,
             verification_code = $3,
             verification_expires = $4
         WHERE id = $5
         RETURNING id, username, email`,
        [username, hashed, code, expires, existingByEmail.id]
      );
      user = updated.rows[0];
    } else {
      // 4) 완전 신규 계정
      const inserted = await pool.query(
        `INSERT INTO users (username, email, password_hash, email_verified,
                            verification_code, verification_expires)
         VALUES ($1, $2, $3, false, $4, $5)
         RETURNING id, username, email`,
        [username, email, hashed, code, expires]
      );
      user = inserted.rows[0];
    }

    // 5) 이메일 발송 (실패 시 롤백까지 할 수 있으면 최고)
    try {
      await sendVerificationEmail(email, code);
    } catch (mailErr) {
      console.error('메일 발송 실패:', mailErr);

      // 과제 규모에서는 "재발급 가능한 상태"로 놔두는 것도 가능하지만,
      // 완전 깔끔하게 가려면 다음과 같이 삭제/되돌리기를 고려:
      // await pool.query('DELETE FROM users WHERE id = $1 AND email_verified = false', [user.id]);

      return res.status(500).json({ message: '인증 이메일 발송에 실패했습니다.' });
    }

    // 6) 응답: 새 계정이든, 재발급이든 둘 다 동일하게 응답
    res.status(200).json({
      message: '인증 코드가 이메일로 전송되었습니다. 이메일을 확인해 주세요.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류입니다.' });
  }
});

// ============================
// 이메일 인증: POST /api/auth/verify-email
// ============================
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'email과 code는 필수입니다.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, email_verified, verification_code, verification_expires
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: '이미 이메일 인증이 완료된 계정입니다.' });
    }

    if (!user.verification_code || !user.verification_expires) {
      return res.status(400).json({ message: '인증 코드가 설정되어 있지 않습니다.' });
    }

    const now = new Date();
    if (now > user.verification_expires) {
      return res.status(400).json({ message: '인증 코드가 만료되었습니다. 다시 회원가입을 진행해 주세요.' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ message: '인증 코드가 올바르지 않습니다.' });
    }

    // 코드가 맞으면 이메일 인증 완료 처리
    const updated = await pool.query(
      `UPDATE users
       SET email_verified = true,
           verification_code = NULL,
           verification_expires = NULL
       WHERE id = $1
       RETURNING id, username, email`,
      [user.id]
    );

    const verifiedUser = updated.rows[0];

    // 인증 완료된 시점에서 JWT 발급 → 바로 로그인 상태로 만들어 줌
    const token = jwt.sign(
      { userId: verifiedUser.id, username: verifiedUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '이메일 인증이 완료되었습니다.',
      token,
      user: {
        id: verifiedUser.id,
        username: verifiedUser.username,
        email: verifiedUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류입니다.' });
  }
});

// ============================
// 로그인: POST /api/auth/login
// ============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email, password는 필수입니다.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, email_verified FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 이메일 인증 안 된 계정은 로그인 불가
    if (!user.email_verified) {
      return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' });
    }

    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 발급
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류입니다.' });
  }
});

module.exports = router;