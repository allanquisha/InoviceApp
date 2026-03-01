import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FieldPay</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Get started with FieldPay</p>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>First name</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Jane" required autoFocus />
            </div>
            <div className="field">
              <label>Last name</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Smith" required />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="min 8 characters" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-muted mt-16" style={{ fontSize: 13, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
