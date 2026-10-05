import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import Table from '../components/Table';
import Button from '../components/Button';
import Badge from '../components/Badge';
import CaseDetail from '../components/CaseDetail';
import EmptyState from '../components/EmptyState';
export default function Referrals() {
  usePageTitle('Derivaciones');
  const [rows, setRows] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setRows((await apiFetch('/derivaciones')).data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    apiFetch('/derivaciones')
      .then((response) => {
        if (active) setRows(response.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const columns = [
    { key: 'paciente_nombre', label: 'Paciente' },
    { key: 'estudiante_origen', label: 'Estudiante de origen' },
    {
      key: 'tratamiento',
      label: 'Propuesta',
      render: (d) => (
        <>
          {d.propuesta.treatment}
          <div>
            {d.propuesta.specialty} · {d.propuesta.priority}
          </div>
        </>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (d) => <Badge value={d.estado} />,
    },
    {
      key: 'destino',
      label: 'Destino',
      render: (d) =>
        d.id_asignacion_destino
          ? `Asignación ${d.id_asignacion_destino}`
          : d.estado === 'aprobada'
            ? 'Pendiente de receptor'
            : '—',
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (d) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setViewing(d.id_asignacion_origen)}
        >
          Ver caso y revisar
        </Button>
      ),
    },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Derivaciones</h1>
          <p className="page-subtitle">
            Revisa el tratamiento propuesto antes de asignar un receptor.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          Actualizar
        </Button>
      </div>
      <p>
        El reparto de casos derivados prioriza menor carga. A igual carga,
        considera más derivaciones aprobadas y luego compatibilidad.
      </p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!rows && !error && <p role="status">Cargando derivaciones…</p>}
      <Table
        caption="Derivaciones y revisiones"
        columns={columns}
        rows={rows}
        keyFn={(d) => d.id}
        empty={
          rows && (
            <EmptyState
              icon="link"
              title="Sin derivaciones"
              description="Aquí aparecerán las propuestas de los estudiantes."
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
