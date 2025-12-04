const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * 1) 내 Task 요약 통계
 * GET /api/stats/summary
 *  - total_tasks: 전체 Task 수
 *  - completed_tasks: 완료된 Task 수
 *  - completion_rate: 완료율 (%)
 */
router.get('/summary', async (req, res) => {
  const userId = req.user.userId;

  try {
    const totalRes = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE user_id = $1',
      [userId]
    );
    const completedRes = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND completed = true',
      [userId]
    );

    const totalTasks = parseInt(totalRes.rows[0].count, 10);
    const completedTasks = parseInt(completedRes.rows[0].count, 10);
    const completionRate = totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

    res.json({
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      completion_rate: completionRate
    });
  } catch (err) {
    console.error('GET /api/stats/summary Error:', err);
    res.status(500).json({ message: '서버 오류: 통계 요약을 가져오지 못했습니다.' });
  }
});

/**
 * 2) 최근 N일 동안의 완료 추이 (그래프용)
 * GET /api/stats/completions/daily?days=30
 *  - [{ day: '2025-12-01', count: 3 }, ...]
 */
router.get('/completions/daily', async (req, res) => {
  const userId = req.user.userId;
  const days = parseInt(req.query.days || '30', 10); // 기본 30일

  try {
    const result = await pool.query(
      `SELECT to_char(completed_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS count
       FROM task_completions
       WHERE user_id = $1
         AND completed_at >= NOW() - $2 * INTERVAL '1 day'
       GROUP BY day
       ORDER BY day`,
      [userId, days]
    );

    // 날짜를 YYYY-MM-DD 문자열로 변환
    const data = result.rows.map(row => ({
      day: row.day,
      count: row.count
    }));

    res.json(data);
  } catch (err) {
    console.error('GET /api/stats/completions/daily Error:', err);
    res.status(500).json({ message: '서버 오류: 일별 완료 통계를 가져오지 못했습니다.' });
  }
});

/**
 * 3) 글로벌 랭킹 (완료 개수 기준 상위 N명)
 * GET /api/stats/ranking?limit=10
 *  - [{ user_id, username, completions }, ...]
 */
router.get('/ranking', async (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10);

  try {
    const result = await pool.query(
      `SELECT u.id AS user_id,
              u.username,
              COUNT(tc.*)::int AS completions
       FROM users u
       LEFT JOIN task_completions tc ON tc.user_id = u.id
       WHERE u.email_verified = true
       GROUP BY u.id, u.username
       ORDER BY completions DESC, user_id ASC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/stats/ranking Error:', err);
    res.status(500).json({ message: '서버 오류: 랭킹 정보를 가져오지 못했습니다.' });
  }
});

module.exports = router;