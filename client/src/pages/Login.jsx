import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/authContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { Input } from '../components/Field';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function Login() {
  usePageTitle('Iniciar sesión');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const dest = user?.role === 'student' ? '/mis-asignaciones' : '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <aside className="login-context">
        <Link to="/landing" className="public-brand" aria-label="Dental Matching, inicio">
          <span className="public-brand-mark"><Icon name="tooth" size={19} /></span>
          <span>Dental Matching</span>
        </Link>
        <div className="login-context-copy">
          <span className="login-context-line" />
          <h2>Todo lo que necesitas, en un solo lugar.</h2>
          <p>Revisa pacientes, estudiantes y asignaciones desde un mismo lugar.</p>
        </div>
        <p className="login-context-note"><Icon name="check-circle" size={16} /> Atención supervisada y tus datos protegidos.</p>
      </aside>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><Icon name="tooth" size={34} /></div>
          <h1>Dental Matching</h1>
          <p>Gestión de pacientes y estudiantes</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@dentalmatching.com"
            required
            autoComplete="email"
          />
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eye-slash' : 'eye'} size={18} />
              </button>
            </div>
          </div>
          <Button type="submit" loading={loading} icon="login" className="btn-block">
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
        <p className="login-alt">
          ¿Eres paciente? <Link to="/landing">Cuéntanos tu caso</Link>
        </p>
      </div>
    </div>
  );
}
