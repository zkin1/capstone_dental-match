import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { Select, Textarea } from '../components/Field';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

const NEXT_STATES = {
  asignado: ['contactado', 'cancelado'],
  notificado: ['contactado', 'cancelado'],
  contactado: ['en_tratamiento', 'cancelado'],
  en_tratamiento: ['completado', 'cancelado'],
};

const STATE_LABELS = {
  contactado: 'Contactado', en_tratamiento: 'En tratamiento', completado: 'Completado', cancelado: 'Cancelado',
};

export default function MisAsignaciones() {
  usePageTitle('Mis Asignaciones');
  const [asignaciones, setAsignaciones] = useState([]);
  const [estudiante, setEstudiante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetch('/asignaciones/mias');
      setAsignaciones(data.data || []);
      setEstudiante(data.estudiante || null);
    } catch (err) {
      setError('No se pudieron cargar tus asignaciones: ' + err.message);
      toast.error('Error al cargar tus asignaciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function saveAssignment(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/asignaciones/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: editing.nextState, observaciones_estudiante: editing.notes }),
      });
      toast.success('Asignación actualizada');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error('No se pudo actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'paciente', label: 'Paciente',
      render: a => (
        <>
          <div style={{ fontWeight: 600 }}>{a.paciente_nombre}</div>
          <div className="muted" style={{ fontSize: 12 }}>{a.paciente_telefono}</div>
        </>
      ),
    },
    { key: 'tratamiento', label: 'Especialidad', render: a => a.especialidad_asignada || '-' },
    { key: 'urgencia', label: 'Urgencia', render: a => <Badge value={a.prioridad} /> },
    { key: 'dolor', label: 'Dolor', render: a => (a.nivel_dolor != null ? `${a.nivel_dolor}/10` : '-') },
    {
      key: 'horario', label: 'Horario',
      render: a => (a.dia_semana_asignado
        ? `${a.dia_semana_asignado}${a.hora_inicio_asignada ? ` · ${a.hora_inicio_asignada}` : ''}`
        : '-'),
    },
    { key: 'score', label: 'Score', render: a => (a.score_compatibilidad ? `${Number(a.score_compatibilidad * 100).toFixed(0)}%` : '-') },
    { key: 'estado', label: 'Estado', render: a => <Badge value={a.estado || 'pendiente'} /> },
    {
      key: 'accion', label: 'Acción',
      render: assignment => NEXT_STATES[assignment.estado]?.length
        ? <Button variant="ghost" size="sm" icon="check-circle" onClick={() => setEditing({ id: assignment.id, currentState: assignment.estado, nextState: NEXT_STATES[assignment.estado][0], notes: assignment.observaciones_estudiante || '' })}>Actualizar</Button>
        : '-',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Mis Asignaciones</h1>
          {estudiante && (
            <p className="page-subtitle">
              Bienvenido/a, <strong>{estudiante.nombre_completo}</strong>
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={load} icon="refresh">Actualizar</Button>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {loading ? (
        <>
          <span className="visually-hidden" role="status">Cargando tus asignaciones…</span>
          <Skeleton variant="table" rows={4} />
        </>
      ) : (
        <Table
          caption="Mis pacientes asignados"
          columns={columns}
          rows={asignaciones}
          keyFn={a => a.id}
          empty={
            <EmptyState
              icon="clipboard"
              title="No tienes pacientes asignados todavía"
              description="Cuando el sistema te asigne un paciente, aparecerá aquí."
            />
          }
        />
      )}

      {editing && (
        <Modal open title="Actualizar seguimiento" onClose={() => setEditing(null)}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={saveAssignment} loading={saving}>Guardar</Button></>}>
          <form className="form-grid" onSubmit={saveAssignment}>
            <Select label="Nuevo estado" value={editing.nextState} onChange={event => setEditing({ ...editing, nextState: event.target.value })}>
              {NEXT_STATES[editing.currentState].map(state => <option key={state} value={state}>{STATE_LABELS[state]}</option>)}
            </Select>
            <Textarea label="Notas de seguimiento" rows={4} value={editing.notes} onChange={event => setEditing({ ...editing, notes: event.target.value })} />
          </form>
        </Modal>
      )}
    </div>
  );
}
