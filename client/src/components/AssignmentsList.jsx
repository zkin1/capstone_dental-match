import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import Table from './Table';
import Button from './Button';
import Badge from './Badge';
import CaseDetail from './CaseDetail';
import EmptyState from './EmptyState';
import { displayLabel } from '../lib/labels';

export default function AssignmentsList({ mine = false }) {
  usePageTitle(mine ? 'Mis Asignaciones' : 'Asignaciones');
  const [rows, setRows] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`/asignaciones${mine ? '/mias' : ''}`);
      setRows(response.data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [mine]);
  useEffect(() => {
    let active = true;
    apiFetch(`/asignaciones${mine ? '/mias' : ''}`)
      .then((response) => {
        if (active) setRows(response.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [mine]);
  const columns = [
    {
      key: 'paciente',
      label: 'Paciente y contacto',
      render: (a) => (
        <>
          <strong>{a.paciente_nombre}</strong>
          <div>{a.paciente_telefono}</div>
          <div>{a.paciente_email || 'Email no informado'}</div>
        </>
      ),
    },
    ...(!mine ? [{ key: 'estudiante_nombre', label: 'Estudiante' }] : []),
    { key: 'especialidad_asignada', label: 'Especialidad' },
    {
      key: 'prioridad',
      label: 'Prioridad',
      render: (a) => <Badge value={a.prioridad} />,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (a) => <Badge value={a.estado}>{displayLabel(a.estado)}</Badge>,
    },
    {
      key: 'horario',
      label: 'Cita propuesta',
      render: (a) => (
        <>
          {String(a.fecha_cita).slice(0, 10)}
          <div>
            {a.dia_semana_asignado} {a.hora_inicio_asignada}
          </div>
        </>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (a) => (
        <Button variant="secondary" size="sm" onClick={() => setViewing(a.id)}>
          Ver caso y seguimiento
        </Button>
      ),
    },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{mine ? 'Mis Asignaciones' : 'Asignaciones'}</h1>
          <p className="page-subtitle">
            Contacto, clasificación, derivación e historial de cada caso.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          Actualizar
        </Button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!rows && !error && <p role="status">Cargando asignaciones…</p>}
      <Table
        columns={columns}
        rows={rows}
        keyFn={(a) => a.id}
        caption="Casos asignados"
        empty={
          rows && (
            <EmptyState
              icon="clipboard"
              title="Sin asignaciones"
              description="Los pacientes asignados aparecerán aquí."
            />
          )
        }
      />
      {viewing && (
        <CaseDetail
          key={viewing}
          assignmentId={viewing}
          onClose={() => setViewing(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
