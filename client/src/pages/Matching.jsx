import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { ConfirmModal } from '../components/Modal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';

export default function Matching() {
  usePageTitle('Matching');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function executeMatching() {
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/matching/auto', { method: 'POST' });
      setResults(data.data);
      const matched = data.data?.matched ?? 0;
      toast.success(`Matching completado: ${matched} asignaciones creadas`);
    } catch (err) {
      setError(err.message);
      toast.error('Error ejecutando matching: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const rows = results?.matches || [];
  const columns = [
    { key: 'paciente', label: 'Paciente', render: r => r.paciente || r.patient_name || '-' },
    { key: 'estudiante', label: 'Estudiante', render: r => r.estudiante || r.student_name || '-' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'horario', label: 'Horario' },
    { key: 'score', label: 'Compatibilidad', render: r => (r.score ? `${Math.round(r.score * 100)}%` : '-') },
    { key: 'estado', label: 'Estado', render: () => <Badge value="asignado" /> },
  ];

  function exportCSV() {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(','),
      ...rows.map(r => keys.map(k => {
        const v = r[k];
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matching_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Matching</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={exportCSV} disabled={!rows.length}>Exportar CSV</Button>
          <Button onClick={() => setConfirmOpen(true)} loading={loading} icon="chart">
            {loading ? 'Ejecutando…' : 'Ejecutar Matching'}
          </Button>
        </div>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      <ConfirmModal
        open={confirmOpen}
        title="Ejecutar matching"
        message="Se ejecutará el algoritmo de matching y se crearán nuevas asignaciones. ¿Continuar?"
        confirmLabel="Ejecutar"
        onConfirm={executeMatching}
        onClose={() => setConfirmOpen(false)}
      />

      {results && (
        <div className="matching-results dm-enter">
          <div className="stats-grid dm-stagger">
            <div className="card stat-card">
              <h3>Procesados</h3>
              <span className="stat-number">{results.processed ?? 0}</span>
            </div>
            <div className="card stat-card">
              <h3>Emparejados</h3>
              <span className="stat-number">{results.matched ?? 0}</span>
            </div>
            <div className="card stat-card">
              <h3>Score Promedio</h3>
              <span className="stat-number">
                {results.averageScore
                  ? `${Math.round(results.averageScore * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <h2 className="form-section-title"><Icon name="link" size={17} /> Resultados del matching</h2>
              <Table caption="Resultados del matching" columns={columns} rows={rows} />
            </>
          )}
          {results.unmatched > 0 && (
            <div className="alert" role="status"><Icon name="warning" size={18} />
              {results.unmatched} caso(s) siguen pendientes por falta de especialidad, capacidad u horario compatible.
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <EmptyState
          icon="chart"
          title="Empareja pacientes con estudiantes"
          description="El algoritmo considera: horario (30%), tratamiento (25%), carga (20%), urgencia (15%), dolor (5%), experiencia (5%)."
          action={<Button onClick={() => setConfirmOpen(true)} icon="chart">Ejecutar matching</Button>}
        />
      )}
    </div>
  );
}
