import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';

interface Requirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: 'At least 8 characters',      met: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)',  met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)',  met: /[a-z]/.test(password) },
    { label: 'One number (0–9)',            met: /[0-9]/.test(password) },
    { label: 'One special character',       met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrength(reqs: Requirement[]): { score: number; label: string; color: string } {
  const score = reqs.filter((r) => r.met).length;
  if (score <= 1) return { score, label: 'Very weak',  color: '#ef4444' };
  if (score === 2) return { score, label: 'Weak',       color: '#f97316' };
  if (score === 3) return { score, label: 'Fair',       color: '#eab308' };
  if (score === 4) return { score, label: 'Strong',     color: '#22c55e' };
  return              { score, label: 'Very strong', color: '#16a34a' };
}

export default function Register() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStrength, setShowStrength] = useState(false);

  const reqs = getRequirements(form.password);
  const strength = getStrength(reqs);
  const allMet = reqs.slice(0, 4).every((r) => r.met); // first 4 are required; 5th is bonus

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allMet) {
      setError('Please meet all password requirements');
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
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              onFocus={() => setShowStrength(true)}
              placeholder="Create a strong password"
              required
            />

            {showStrength && form.password.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {/* Strength bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 4,
                        background: strength.score >= i ? strength.color : 'var(--border)',
                        transition: 'background 0.25s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: strength.color, marginBottom: 10 }}>
                  {strength.label}
                </div>

                {/* Requirements checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {reqs.map((req) => (
                    <div
                      key={req.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 12,
                        color: req.met ? '#16a34a' : 'var(--text-muted)',
                        transition: 'color 0.2s',
                      }}
                    >
                      {req.met
                        ? <Check size={13} style={{ flexShrink: 0 }} />
                        : <X size={13} style={{ flexShrink: 0, color: 'var(--border)' }} />
                      }
                      {req.label}
                      {req === reqs[4] && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || (showStrength && !allMet)}
          >
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
