const express = require('express');
const router = express.Router();
const pool = require('../db');

// 현재 로그인한 사용자 ID는 req.user.userId 로 사용

// 1) 내 Task 전체 조회: GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, due_date, priority, completed,
              created_at, updated_at
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tasks Error:', err);
    res.status(500).json({ message: '서버 오류: Task 목록을 불러오지 못했습니다.' });
  }
});

// 2) 단일 Task 조회: GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT id, title, description, due_date, priority, completed,
              created_at, updated_at
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [taskId, req.user.userId]
    );

    const task = result.rows[0];
    if (!task) {
      return res.status(404).json({ message: '해당 Task를 찾을 수 없습니다.' });
    }

    res.json(task);
  } catch (err) {
    console.error('GET /api/tasks/:id Error:', err);
    res.status(500).json({ message: '서버 오류: Task를 불러오지 못했습니다.' });
  }
});

// 3) Task 생성: POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description, due_date, priority } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'title은 필수입니다.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, due_date, priority, completed,
                 created_at, updated_at`,
      [req.user.userId, title, description || null, due_date || null, priority || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/tasks Error:', err);
    res.status(500).json({ message: '서버 오류: Task를 생성하지 못했습니다.' });
  }
});

// 4) Task 수정: PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const taskId = req.params.id;
  const { title, description, due_date, priority, completed } = req.body;

  try {
    // 먼저 이 Task가 현재 사용자 소유인지 확인
    const check = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.userId]
    );

    if (!check.rows[0]) {
      return res.status(404).json({ message: '해당 Task를 찾을 수 없습니다.' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           due_date = $3,
           priority = $4,
           completed = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, title, description, due_date, priority, completed,
                 created_at, updated_at`,
      [
        title,
        description || null,
        due_date || null,
        priority ?? 0,
        completed ?? false,
        taskId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/tasks/:id Error:', err);
    res.status(500).json({ message: '서버 오류: Task를 수정하지 못했습니다.' });
  }
});

// 5) Task 삭제: DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.userId]
    );

    // rowCount가 0이면 삭제된 게 없음 → 해당 Task가 없거나 내 것이 아님
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '해당 Task를 찾을 수 없습니다.' });
    }

    res.status(204).send(); // 내용 없는 성공 응답
  } catch (err) {
    console.error('DELETE /api/tasks/:id Error:', err);
    res.status(500).json({ message: '서버 오류: Task를 삭제하지 못했습니다.' });
  }
});

module.exports = router;

// 6) Task를 완료로 표시 + 완료 이력 기록: POST /api/tasks/:id/complete
router.post('/:id/complete', async (req, res) => {
  const taskId = req.params.id;

  try {
    // 1. 이 Task가 내 것인지 확인
    const check = await pool.query(
      'SELECT id, completed FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.userId]
    );

    const task = check.rows[0];
    if (!task) {
      return res.status(404).json({ message: '해당 Task를 찾을 수 없습니다.' });
    }

    // 2. tasks 테이블의 completed = true 로 업데이트
    await pool.query(
      `UPDATE tasks
       SET completed = true,
           updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    // 3. 완료 이력(task_completions)에 한 줄 추가
    await pool.query(
      `INSERT INTO task_completions (task_id, user_id)
       VALUES ($1, $2)`,
      [taskId, req.user.userId]
    );

    res.status(200).json({ message: 'Task 완료 처리 및 이력 기록 완료' });
  } catch (err) {
    console.error('POST /api/tasks/:id/complete Error:', err);
    res.status(500).json({ message: '서버 오류: Task 완료 처리 실패' });
  }
});