import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const data = await apiFetch('/dashboard/stats');
      setStats(data.data || data);
    } catch (err) {
      setError('No se pudieron cargar las estadísticas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {loading ? (
        <>
          <span className="visually-hidden" role="status">Cargando dashboard…</span>
          <Skeleton variant="cards" />
        </>
      ) : (
        <>
          <div className="stats-grid dm-stagger">
            <div className="card stat-card">
              <div className="stat-icon"><Icon name="users" size={22} /></div>
              <h3>Pacientes</h3>
              <span className="stat-number">{stats?.pacientes ?? stats?.totalPacientes ?? 0}</span>
            </div>
            <div className="card stat-card">
              <div className="stat-icon"><Icon name="grad-cap" size={22} /></div>
              <h3>Estudiantes</h3>
              <span className="stat-number">{stats?.estudiantes ?? stats?.totalEstudiantes ?? 0}</span>
            </div>
            <div className="card stat-card">
              <div className="stat-icon"><Icon name="link" size={22} /></div>
              <h3>Asignaciones</h3>
              <span className="stat-number">{stats?.asignaciones ?? stats?.totalAsignaciones ?? 0}</span>
            </div>
            <div className="card stat-card">
              <div className="stat-icon"><Icon name="chart" size={22} /></div>
              <h3>Score Promedio</h3>
              <span className="stat-number">{stats?.scorePromedio ? `${Math.round(stats.scorePromedio)}%` : 'N/A'}</span>
            </div>
          </div>

          <div className="quick-grid dm-stagger">
            <Link className="quick-card" to="/matching">
              <Icon name="chart" size={22} />
              <span>Ejecutar matching<small>Aplicar pesos a pacientes pendientes</small></span>
            </Link>
            <Link className="quick-card" to="/patients">
              <Icon name="users" size={22} />
              <span>Pacientes<small>Registro y seguimiento</small></span>
            </Link>
            <Link className="quick-card" to="/assignments">
              <Icon name="link" size={22} />
              <span>Asignaciones<small>Ver asignaciones activas</small></span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
