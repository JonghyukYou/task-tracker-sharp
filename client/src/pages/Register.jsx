import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [verifyCode, setVerifyCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSending(true);

    try {
      const res = await api.post('/auth/register', form);
      // 성공: 새 계정이든, 재발급이든 상관없이 verify 단계로 이동
      alert(res.data.message || '인증 코드가 이메일로 전송되었습니다.');
      setStep('verify');
      setError('');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || '회원가입 실패';
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await api.post('/auth/verify-email', {
        email: form.email,
        code: verifyCode,
      });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || '이메일 인증 실패';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">회원가입</h2>

      {step === 'form' && (
        <>
          <form className="form" onSubmit={handleSubmit}>
            <div>
              <div className="form-label">닉네임</div>
              <input
                className="form-input"
                name="username"
                placeholder="닉네임"
                value={form.username}
                onChange={handleChange}
              />
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                2~16자, 중복 닉네임 불가
              </div>
            </div>
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
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                8~64자 권장
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={isSending}>
              {isSending ? '전송 중...' : '인증 코드 받기'}
            </button>
          </form>
        </>
      )}

      {step === 'verify' && (
        <>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            <b>{form.email}</b> 으로 전송된 인증 코드를 입력해 주세요.
          </p>
          <form className="form" onSubmit={handleVerify}>
            <input
              className="form-input"
              placeholder="인증 코드 6자리"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={isVerifying}>
              {isVerifying ? '인증 중...' : '이메일 인증 완료'}
            </button>
          </form>
          <p style={{ fontSize: 12, marginTop: 4, color: '#6b7280' }}>
            인증 메일을 받지 못했다면, 같은 이메일로 회원가입을 다시 시도하면 코드가 재전송됩니다.
          </p>
        </>
      )}

      {error && <p className="form-error">{error}</p>}

      <p style={{ marginTop: 8 }}>
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}

export default Register;