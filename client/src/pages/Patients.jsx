import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { Input, Select, Textarea } from '../components/Field';
import Modal, { ConfirmModal } from '../components/Modal';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

const SPECIALTIES = ['Endodoncia', 'Operatoria Dental', 'Ortodoncia', 'Periodoncia', 'Cirugía Oral', 'Odontopediatría', 'Prótesis Fija', 'Prótesis Removible'];
const PRIORITIES = ['Baja', 'Moderada', 'Alta', 'Muy Alta'];
const CITIES = ['Metropolitana', 'Valparaíso', 'Concepción'];
const EMPTY_FORM = { nombre_completo: '', telefono: '', email: '', ciudad: 'Metropolitana', edad: '', tipo_tratamiento: '', descripcion_caso: '', prioridad: 'Moderada', nivel_dolor: 0 };

export default function Patients() {
  usePageTitle('Pacientes');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  async function loadPatients() {
    try {
      setError('');
      const data = await apiFetch('/pacientes');
      setPatients(data.data || []);
    } catch (err) {
      setError('No se pudieron cargar los pacientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPatients(); }, []);

  async function createPatient(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/pacientes', { method: 'POST', body: JSON.stringify({ ...form, edad: Number(form.edad) }) });
      toast.success('Paciente registrado como pendiente');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadPatients();
    } catch (err) {
      toast.error('Error al registrar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function savePatient(event) {
    event?.preventDefault?.();
    setSaving(true);
    try {
      await apiFetch(`/pacientes/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre_completo: editing.nombre_completo,
          telefono: editing.telefono,
          email: editing.email,
          edad: Number(editing.edad),
          ciudad: editing.ciudad,
          tipo_tratamiento_inferido: editing.tipo_tratamiento_inferido,
          prioridad: editing.prioridad,
          nivel_dolor: Number(editing.nivel_dolor),
        }),
      });
      toast.success('Paciente actualizado');
      setEditing(null);
      await loadPatients();
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivatePatient() {
    setDeleting(current => ({ ...current, loading: true }));
    try {
      await apiFetch(`/pacientes/${deleting.id}`, { method: 'DELETE' });
      toast.success('Paciente desactivado');
      setDeleting(null);
      await loadPatients();
    } catch (err) {
      toast.error('Error al desactivar: ' + err.message);
      setDeleting(current => ({ ...current, loading: false }));
    }
  }

  const columns = [
    { key: 'nombre', label: 'Nombre', render: patient => patient.nombre_completo },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'tratamiento', label: 'Especialidad', render: patient => patient.tipo_tratamiento_inferido || '-' },
    { key: 'prioridad', label: 'Prioridad', render: patient => <Badge value={patient.prioridad} /> },
    { key: 'estado', label: 'Estado', render: patient => <Badge value={patient.estado} /> },
    { key: 'estudiante', label: 'Asignado a', render: patient => patient.estudiante_nombre || '-' },
    {
      key: 'acciones', label: 'Acciones',
      render: patient => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" icon="eye" onClick={() => setViewing(patient)} aria-label={`Ver a ${patient.nombre_completo}`} />
          <Button variant="ghost" size="sm" icon="pencil" onClick={() => setEditing({ ...patient })} aria-label={`Editar a ${patient.nombre_completo}`} />
          <Button variant="ghost" size="sm" icon="warning" onClick={() => setDeleting({ id: patient.id, name: patient.nombre_completo })} aria-label={`Desactivar a ${patient.nombre_completo}`} />
        </div>
      ),
    },
  ];

  const patientFields = (value, change) => (
    <>
      <Input label="Nombre completo" required value={value.nombre_completo} onChange={event => change({ ...value, nombre_completo: event.target.value })} />
      <Input label="Teléfono" required value={value.telefono} onChange={event => change({ ...value, telefono: event.target.value })} />
      <Input label="Email" type="email" value={value.email || ''} onChange={event => change({ ...value, email: event.target.value })} />
      <Input label="Edad" type="number" required min="1" max="120" value={value.edad} onChange={event => change({ ...value, edad: event.target.value })} />
      <Select label="Ciudad" required value={value.ciudad} onChange={event => change({ ...value, ciudad: event.target.value })}>
        {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
      </Select>
      <Select label="Especialidad" required value={value.tipo_tratamiento || value.tipo_tratamiento_inferido || ''} onChange={event => change({ ...value, tipo_tratamiento: event.target.value, tipo_tratamiento_inferido: event.target.value })}>
        <option value="">Seleccionar…</option>{SPECIALTIES.map(specialty => <option key={specialty} value={specialty}>{specialty}</option>)}
      </Select>
      <Select label="Prioridad" value={value.prioridad} onChange={event => change({ ...value, prioridad: event.target.value })}>
        {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
      </Select>
      <Input label="Nivel de dolor" type="number" min="0" max="10" value={value.nivel_dolor} onChange={event => change({ ...value, nivel_dolor: event.target.value })} />
    </>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Pacientes</h1><p className="page-subtitle">Casos pendientes, asignados y completados.</p></div>
        <Button onClick={() => setShowForm(open => !open)} icon={showForm ? 'close' : 'plus'} variant={showForm ? 'secondary' : 'primary'}>{showForm ? 'Cancelar' : 'Nuevo paciente'}</Button>
      </div>
      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {showForm && (
        <form className="card form-card dm-enter" onSubmit={createPatient}>
          <div className="form-grid">{patientFields(form, setForm)}<Textarea label="Descripción del caso" className="full-width" rows={3} value={form.descripcion_caso} onChange={event => setForm({ ...form, descripcion_caso: event.target.value })} /></div>
          <Button type="submit" loading={submitting}>{submitting ? 'Guardando…' : 'Registrar pendiente'}</Button>
        </form>
      )}

      {loading ? <><span className="visually-hidden" role="status">Cargando pacientes…</span><Skeleton variant="table" rows={5} /></> : (
        <Table caption="Listado de pacientes" columns={columns} rows={patients} keyFn={patient => patient.id}
          empty={<EmptyState icon="users" title="No hay pacientes registrados" description="Registra el primer caso para comenzar." />} />
      )}

      {viewing && (
        <Modal open title="Perfil del paciente" onClose={() => setViewing(null)}>
          <div className="form-grid">
            <p><strong>Nombre:</strong> {viewing.nombre_completo}</p><p><strong>Teléfono:</strong> {viewing.telefono}</p>
            <p><strong>Email:</strong> {viewing.email || '-'}</p><p><strong>Edad:</strong> {viewing.edad}</p>
            <p><strong>Ciudad:</strong> {viewing.ciudad}</p><p><strong>Especialidad:</strong> {viewing.tipo_tratamiento_inferido || '-'}</p>
            <p><strong>Prioridad:</strong> <Badge value={viewing.prioridad} /></p><p><strong>Dolor:</strong> {viewing.nivel_dolor}/10</p>
            <p><strong>Estado:</strong> <Badge value={viewing.estado} /></p><p><strong>Asignado a:</strong> {viewing.estudiante_nombre || '-'}</p>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal open title="Editar paciente" onClose={() => setEditing(null)}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={savePatient} loading={saving}>Guardar</Button></>}>
          <form className="form-grid" onSubmit={savePatient}>{patientFields(editing, setEditing)}</form>
        </Modal>
      )}

      <ConfirmModal open={Boolean(deleting)} title="Desactivar paciente"
        message={`Se cancelarán sus asignaciones activas y el registro dejará de aparecer. ¿Desactivar a ${deleting?.name || 'este paciente'}?`}
        confirmLabel="Desactivar" loading={deleting?.loading} onConfirm={deactivatePatient} onClose={() => setDeleting(null)} />
    </div>
  );
}
