const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  // Authorization 헤더가 없으면 로그인 안 된 상태
  if (!authHeader) {
    return res.status(401).json({ message: '토큰이 없습니다. (Authorization 헤더 없음)' });
  }

  // "Bearer 토큰값" 형태이므로 공백으로 나눠서 두 번째 값이 실제 토큰
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '토큰 형식이 올바르지 않습니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 토큰 안의 userId, username 등을 req.user에 저장해 다음 라우트에서 사용
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Verify Error:', err);
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};