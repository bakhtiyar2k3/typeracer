import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, ensureGuest, status } = useAuthStore();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const playAsGuest = async () => {
    setError(null);
    try {
      await ensureGuest();
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const loading = status === 'loading';

  return (
    <div className="flex flex-1 items-center justify-center py-6">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold text-text">log in</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-secondary">
            username or email
            <input
              className="input"
              value={form.identifier}
              onChange={update('identifier')}
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            password
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner /> : 'log in'}
          </button>
        </form>

        <button type="button" className="btn-ghost mt-3 w-full" onClick={playAsGuest}>
          continue as guest
        </button>

        <p className="mt-6 text-center text-sm text-secondary">
          no account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            register
          </Link>
        </p>
      </div>
    </div>
  );
}
