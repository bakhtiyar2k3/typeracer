import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, status } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', country: '' });
  const [error, setError] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await register(form);
      navigate(`/profile/${user.username}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const loading = status === 'loading';

  return (
    <div className="flex flex-1 items-center justify-center py-6">
      <div className="card w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold text-text">create account</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-secondary">
            username
            <input
              className="input"
              value={form.username}
              onChange={update('username')}
              autoComplete="username"
              minLength={3}
              maxLength={20}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            email
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
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
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            country <span className="text-xs">(optional)</span>
            <input className="input" value={form.country} onChange={update('country')} maxLength={56} />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner /> : 'register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
