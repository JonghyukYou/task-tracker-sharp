import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import CompletionChart from '../components/CompletionChart';
import RankingList from '../components/RankingList';

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 0,
  });
  const [dailyData, setDailyData] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
  });

  // ✅ 토큰 없으면 로그인으로 돌려보내기
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ✅ 요약 통계 불러오기 (컴포넌트 스코프에 선언)
  const fetchSummary = async () => {
    try {
      const res = await api.get('/stats/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('summary error', err);
    }
  };

  // ✅ Task 목록 불러오기 (컴포넌트 스코프에 선언)
  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('tasks error', err);
    }
  };

  // 일별 완료 통계 불러오기
  const fetchDailyData = async () => {
    try {
      const res = await api.get('/stats/completions/daily?days=30');
      setDailyData(res.data);
    } catch (err) {
      console.error('daily stats error', err);
    }
  };

  // 글로벌 랭킹 불러오기
  const fetchRanking = async () => {
    try {
      const res = await api.get('/stats/ranking?limit=10');
      setRanking(res.data);
    } catch (err) {
      console.error('ranking error', err);
    }
  };

  // 마운트 시 한 번 호출
  useEffect(() => {
    fetchSummary();
    fetchTasks();
    fetchDailyData();
    fetchRanking();
  }, []); // eslint가 뭐라 하면 fetchSummary/fetchTasks를 useCallback으로 감싸도 됨

  // 새 작업 추가
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      await api.post('/tasks', newTask);
      setNewTask({ title: '', description: '', due_date: '', priority: 0 });
      await fetchSummary();
      await fetchTasks();
      await fetchDailyData();
      await fetchRanking();
    } catch (err) {
      console.error('create task error', err);
      alert('작업 생성 중 오류가 발생했습니다.');
    }
  };

  // 작업 완료 처리
  const handleCompleteTask = async (id) => {
    try {
      await api.post(`/tasks/${id}/complete`);
      await fetchSummary();
      await fetchTasks();
      await fetchDailyData();
      await fetchRanking();
    } catch (err) {
      console.error('complete task error', err);
      alert('작업 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 작업 삭제
  const handleDeleteTask = async (id) => {
    if (!window.confirm('정말 삭제할까요?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      await fetchSummary();
      await fetchTasks();
      await fetchDailyData();
      await fetchRanking();
    } catch (err) {
      console.error('delete task error', err);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  };

  // 숫자 우선순위를 텍스트로 변환
const getPriorityLabel = (p) => {
  if (p === 2) return '높음';
  if (p === 1) return '보통';
  return '낮음';
};

// 마감일 + D-Day 포맷팅
const formatDueDateWithDday = (dateString) => {
  if (!dateString) return '';

  const due = new Date(dateString);

  // 날짜 문자열 (YYYY-MM-DD)
  const year = due.getFullYear();
  const month = String(due.getMonth() + 1).padStart(2, '0');
  const day = String(due.getDate()).padStart(2, '0');
  const dateLabel = `${year}-${month}-${day}`;

  // 오늘 날짜 (시각 무시하고 날짜 기준으로만 계산)
  const today = new Date();
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const dueUTC = Date.UTC(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  const diffDays = Math.round((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));

  let dday;
  if (diffDays > 0) {
    dday = `D-${diffDays}`;
  } else if (diffDays === 0) {
    dday = 'D-Day';
  } else {
    // 이미 지난 마감일: D+N 형식 (원하면 '마감 지남' 같은 텍스트로 바꿔도 됨)
    dday = `D+${Math.abs(diffDays)}`;
  }

  return `${dateLabel} (${dday})`;
};

  return (
    <div>
      <div className="dashboard-header-row">
        <div>
          <h2 className="page-title">대시보드</h2>
          <div className="dashboard-subtitle">나의 작업 진행 상태와 랭킹을 한눈에 확인하세요.</div>
        </div>
      </div>

      {/* 통계 요약 */}
      {summary ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">전체 작업</div>
            <div className="stat-value">{summary.total_tasks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">완료된 작업</div>
            <div className="stat-value">{summary.completed_tasks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">완료율</div>
            <div className="stat-value">{summary.completion_rate}%</div>
          </div>
        </div>
      ) : (
        <p>통계 불러오는 중...</p>
      )}

      {/* 완료 추이 그래프 */}
      <section className="section">
        <div className="section-title">최근 30일 완료 추이</div>
        <div className="section-caption">매일 완료한 작업 개수를 라인 차트로 표시합니다.</div>
        <CompletionChart data={dailyData} />
      </section>

      {/* 글로벌 랭킹 */}
      <section className="section">
        <div className="section-title">글로벌 작업 완료 랭킹</div>
        <div className="section-caption">완료한 작업 개수 기준 상위 10명의 사용자입니다.</div>
        <RankingList ranking={ranking} currentUser={user} />
      </section>

      {/* 새 작업 추가 */}
      <section className="section">
        <div className="section-title">새 작업 추가</div>
        <div className="section-caption">오늘 해야 할 일을 빠르게 등록해 보세요.</div>
        <div className="card">
          <form className="task-form" onSubmit={handleCreateTask}>
            <input
              className="form-input"
              placeholder="작업 제목"
              value={newTask.title}
              onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className="form-input"
              placeholder="설명 (선택)"
              value={newTask.description}
              onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className="task-form-row">
              <input
                className="form-input"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask((prev) => ({ ...prev, due_date: e.target.value }))}
              />
              <select
                className="form-input"
                value={newTask.priority}
                onChange={(e) => setNewTask((prev) => ({ ...prev, priority: Number(e.target.value) }))}
              >
                <option value={0}>우선순위: 낮음</option>
                <option value={1}>우선순위: 보통</option>
                <option value={2}>우선순위: 높음</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" type="submit">
                추가
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Task 리스트 */}
      <section className="section">
        <div className="section-title">내 작업 목록</div>
        <div className="section-caption">진행 중인 작업을 완료하거나 정리할 수 있습니다.</div>

        {tasks.length === 0 ? (
          <p>아직 등록된 작업이 없습니다.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="task-item">
                <div className="task-item-left">
                  <div className="task-title-row">
                    <span className="task-status-icon">{t.completed ? '✅' : '⬜'}</span>
                    <span className="task-title">{t.title}</span>
                  </div>
                  <div className="task-meta">
                    우선순위: {getPriorityLabel(t.priority)}{' '}
                    {t.due_date && <>· 마감일: {formatDueDateWithDday(t.due_date)}</>}
                  </div>
                  {t.description && <div className="task-meta">{t.description}</div>}
                </div>
                <div className="task-actions">
                  {!t.completed && (
                    <button className="btn btn-secondary" onClick={() => handleCompleteTask(t.id)}>
                      완료
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => handleDeleteTask(t.id)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
