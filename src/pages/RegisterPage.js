import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { Eye, EyeOff, TrendingUp, CheckCircle } from 'lucide-react';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const pwStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = pwStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthClass = ['', 'weak', 'fair', 'good', 'strong'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username);
      setDone(true);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('This email is already registered.');
      else setError('Registration failed. Please try again.');
      setLoading(false);
    }
  };

  if (done) return (
    <div className="auth-container">
      <div className="auth-card text-center">
        <CheckCircle size={56} className="auth-success-icon" />
        <h2 className="auth-title">Check your email</h2>
        <p className="auth-subtitle">We sent a verification link to <strong>{form.email}</strong>.<br />Click it to activate your account, then sign in.</p>
        <p className="auth-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
          You'll start with a free 7-day Premium trial — no card required!
        </p>
        <button className="auth-btn" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <TrendingUp size={32} className="auth-logo-icon" />
          <span className="auth-brand"><span className="brand-wealth">Wealth</span><span className="brand-flow">Flow</span></span>
        </div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Start your free 7-day Premium trial</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input type="text" value={form.username} onChange={set('username')} required placeholder="johndoe" />
          </div>
          <div className="auth-field">
            <label>Email address</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <div className="pw-wrapper">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} required placeholder="Min. 8 characters" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="pw-strength-bar">
                <div className={`pw-strength-fill ${strengthClass}`} style={{ width: `${(strength / 4) * 100}%` }} />
              </div>
            )}
            {form.password && <span className={`pw-strength-label ${strengthClass}`}>{strengthLabel}</span>}
          </div>
          <div className="auth-field">
            <label>Confirm password</label>
            <div className="pw-wrapper">
              <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} required placeholder="Repeat password" />
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
