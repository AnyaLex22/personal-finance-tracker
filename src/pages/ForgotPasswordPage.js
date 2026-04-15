import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, MailCheck } from 'lucide-react';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email.');
      else setError('Failed to send reset email. Please try again.');
    }
    setLoading(false);
  };

  if (sent) return (
    <div className="auth-container">
      <div className="auth-card text-center">
        <MailCheck size={56} className="auth-success-icon" />
        <h2 className="auth-title">Check your email</h2>
        <p className="auth-subtitle">We sent a password reset link to <strong>{email}</strong>.<br />Click the link to set a new password.</p>
        <Link to="/login" className="auth-btn" style={{ display: 'block', marginTop: '1.5rem', textAlign: 'center' }}>Back to Login</Link>
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
        <h2 className="auth-title">Forgot password?</h2>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-switch"><Link to="/login">← Back to Login</Link></p>
      </div>
    </div>
  );
}
