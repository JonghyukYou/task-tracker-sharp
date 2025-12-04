import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 언제든지 localStorage에서 꺼내 쓰는 방식
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // 로그인/회원가입 페이지에서만 user 변화에 따라 헤더 갱신되게끔
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    setUser(parsed);
  }, [location.pathname]); // 경로가 바뀔 때마다 한 번씩 최신값으로 갱신

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="app">
      <div className="app-inner">
        <header className="app-header">
          <div className="app-title">
            Task Tracker #
            <span className="app-title-badge">beta</span>
          </div>
          <nav className="app-nav">
            {user ? (
              <>
                <span className="app-username">{user.username}</span>
                <button className="btn btn-secondary" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="app-link" to="/login">
                  로그인
                </Link>
                <Link className="app-link" to="/register">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default App;
