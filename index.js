require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');          
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const authenticate = require('./middlewares/authenticate');

const app = express();

app.use(cors());
app.use(express.json());

// 헬스 체크
app.get('/', (req, res) => {
  res.send('Task Tracker API Server is running!');
});

// DB 연결 확인용
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ 인증 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/stats', authenticate, statsRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});