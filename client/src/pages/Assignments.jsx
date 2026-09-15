import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { Select } from '../components/Field';
import Modal, { ConfirmModal } from '../components/Modal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

const ESTADOS = [
  { value: 'asignado', label: 'Asignado' },
  { value: 'notificado', label: 'Notificado' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'en_tratamiento', label: 'En tratamiento' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const TRANSITIONS = {
  asignado: ['notificado', 'contactado', 'cancelado'],
  notificado: ['contactado', 'cancelado'],
  contactado: ['en_tratamiento', 'cancelado'],
  en_tratamiento: ['completado', 'cancelado'],
  completado: [], cancelado: [],
};

export default function Assignments() {
  usePageTitle('Asignaciones');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  const loadAssignments = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetch('/asignaciones');
      setAssignments(data.data || data.rows || []);
    } catch (err) {
      setError('No se pudieron cargar las asignaciones: ' + err.message);
      toast.error('Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  async function saveAssignment(e) {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await apiFetch('/asignaciones/' + editing.id, {
        method: 'PUT',
        body: JSON.stringify({
          estado: editing.estado,
          observaciones_estudiante: editing.observaciones_estudiante || '',
        }),
      });
      toast.success('Asignación actualizada');
      setEditing(null);
      await loadAssignments();
    } catch (err) {
      toast.error('Error al actualizar asignación: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment() {
    setDeleting(prev => ({ ...prev, loading: true }));
    try {
      await apiFetch('/asignaciones/' + deleting.id, { method: 'DELETE' });
      toast.success('Asignación cancelada');
      setDeleting(null);
      await loadAssignments();
    } catch (err) {
      toast.error('Error al eliminar asignación: ' + err.message);
      setDeleting(prev => ({ ...prev, loading: false }));
    }
  }

  const columns = [
    { key: 'paciente', label: 'Paciente', render: a => a.paciente_nombre || a.nombre_paciente || '-' },
    { key: 'estudiante', label: 'Estudiante', render: a => a.estudiante_nombre || a.nombre_estudiante || '-' },
    { key: 'fecha', label: 'Cita propuesta', render: a => a.fecha_cita ? new Date(`${String(a.fecha_cita).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL') : '-' },
    { key: 'score', label: 'Compatibilidad', render: a => (a.score_compatibilidad ? `${Math.round(a.score_compatibilidad * 100)}%` : '-') },
    { key: 'estado', label: 'Estado', render: a => <Badge value={a.estado} /> },
    {
      key: 'acciones', label: 'Acciones',
      render: a => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" icon="eye" onClick={() => setViewing(a)} aria-label="Ver asignación" />
          {TRANSITIONS[a.estado]?.length > 0 && <Button variant="ghost" size="sm" icon="check-circle" onClick={() => setEditing({ ...a, currentState: a.estado, estado: TRANSITIONS[a.estado][0] })} aria-label="Cambiar estado" />}
          {!['completado', 'cancelado'].includes(a.estado) && <Button variant="ghost" size="sm" icon="warning" onClick={() => setDeleting({ id: a.id, name: a.paciente_nombre || 'asignación' })} aria-label="Cancelar asignación" />}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Asignaciones</h1>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {loading ? (
        <>
          <span className="visually-hidden" role="status">Cargando asignaciones…</span>
          <Skeleton variant="table" rows={5} />
        </>
      ) : (
        <Table
          caption="Listado de asignaciones"
          columns={columns}
          rows={assignments}
          keyFn={a => a.id}
          empty={
            <EmptyState
              icon="link"
              title="Sin asignaciones"
              description="Las asignaciones aparecerán aquí al ejecutar el matching."
            />
          }
        />
      )}

      {viewing && (
        <Modal open={!!viewing} title="Detalle de asignación" onClose={() => setViewing(null)}>
          <div className="form-grid" style={{ minWidth: 280 }}>
            <p><strong>Paciente:</strong> {viewing.paciente_nombre || viewing.nombre_paciente || '-'}</p>
            <p><strong>Estudiante:</strong> {viewing.estudiante_nombre || viewing.nombre_estudiante || '-'}</p>
            <p><strong>Fecha:</strong> {viewing.fecha_asignacion ? new Date(viewing.fecha_asignacion).toLocaleString('es-ES') : '-'}</p>
            <p><strong>Cita propuesta:</strong> {viewing.fecha_cita ? String(viewing.fecha_cita).slice(0, 10) : '-'}</p>
            <p><strong>Horario:</strong> {viewing.dia_semana_asignado} {viewing.hora_inicio_asignada}-{viewing.hora_fin_asignada}</p>
            <p><strong>Compatibilidad:</strong> {viewing.score_compatibilidad ? `${Math.round(viewing.score_compatibilidad * 100)}%` : '-'}</p>
            <p><strong>Estado:</strong> <Badge value={viewing.estado} /></p>
            <p style={{ gridColumn: '1 / -1' }}><strong>Observaciones:</strong> {viewing.observaciones_sistema || '-'}</p>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          open={!!editing}
          title="Cambiar estado de asignación"
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveAssignment} loading={saving}>Guardar</Button>
            </>
          }
        >
          <form className="form-grid" onSubmit={saveAssignment}>
            <Select label="Estado" value={editing.estado} onChange={e => setEditing({ ...editing, estado: e.target.value })}>
              {ESTADOS.filter(option => TRANSITIONS[editing.currentState]?.includes(option.value)).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleting}
        title="Cancelar asignación"
        message={`El paciente volverá a la cola de matching y se liberará la carga del estudiante. ¿Cancelar la asignación de ${deleting?.name || 'este paciente'}?`}
        confirmLabel="Cancelar asignación"
        loading={deleting?.loading}
        onConfirm={deleteAssignment}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
