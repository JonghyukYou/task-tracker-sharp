import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await api.post('/auth/login', form);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || '로그인에 실패했습니다.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">로그인</h2>
      <p className="dashboard-subtitle" style={{ marginBottom: 16 }}>
        가입한 이메일과 비밀번호를 입력해 주세요.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div>
          <div className="form-label">이메일</div>
          <input
            className="form-input"
            name="email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <div className="form-label">비밀번호</div>
          <input
            className="form-input"
            name="password"
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p style={{ marginTop: 8 }}>
        아직 계정이 없나요? <Link to="/register">회원가입</Link>
      </p>
    </div>
  );
}

export default Login;