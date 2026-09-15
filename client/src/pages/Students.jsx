import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { Input, Select } from '../components/Field';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';

const CITIES = ['Metropolitana', 'Valparaíso', 'Concepción'];

export default function Students() {
  usePageTitle('Estudiantes');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function loadStudents() {
    try {
      setError('');
      const data = await apiFetch('/estudiantes');
      setStudents(data.data || []);
    } catch (err) {
      setError('No se pudieron cargar los estudiantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  async function saveStudent(event) {
    event?.preventDefault?.();
    setSaving(true);
    try {
      await apiFetch(`/estudiantes/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre_completo: editing.nombre_completo,
          email: editing.email,
          telefono: editing.telefono,
          año_carrera: editing.año_carrera,
          universidad: editing.universidad,
          ciudad: editing.ciudad,
          casos_necesarios: Number(editing.casos_necesarios),
          estado: editing.estado,
        }),
      });
      toast.success('Estudiante actualizado');
      setEditing(null);
      await loadStudents();
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'nombre', label: 'Nombre', render: student => student.nombre_completo },
    { key: 'codigo', label: 'Código', render: student => student.codigo_estudiante },
    { key: 'año', label: 'Año', render: student => student.año_carrera },
    { key: 'especialidades', label: 'Especialidades', render: student => student.especialidades || '-' },
    { key: 'casos', label: 'Carga', render: student => `${student.casos_activos}/${student.casos_necesarios}` },
    { key: 'estado', label: 'Estado', render: student => <Badge value={student.estado} /> },
    {
      key: 'acciones', label: 'Acciones',
      render: student => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" icon="eye" onClick={() => setViewing(student)} aria-label={`Ver a ${student.nombre_completo}`} />
          <Button variant="ghost" size="sm" icon="pencil" onClick={() => setEditing({ ...student })} aria-label={`Editar a ${student.nombre_completo}`} />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Estudiantes</h1>
          <p className="page-subtitle">Perfiles, especialidades, disponibilidad y carga actual.</p>
        </div>
        <Link to="/registro-estudiante" className="btn btn-primary"><Icon name="plus" size={17} /> Registrar estudiante</Link>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {loading ? (
        <><span className="visually-hidden" role="status">Cargando estudiantes…</span><Skeleton variant="table" rows={5} /></>
      ) : (
        <Table
          caption="Listado de estudiantes"
          columns={columns}
          rows={students}
          keyFn={student => student.id}
          empty={<EmptyState icon="grad-cap" title="No hay estudiantes registrados" description="Registra un estudiante con sus horarios para habilitar el matching." />}
        />
      )}

      {viewing && (
        <Modal open title="Perfil del estudiante" onClose={() => setViewing(null)}>
          <div className="form-grid">
            <p><strong>Nombre:</strong> {viewing.nombre_completo}</p>
            <p><strong>Código:</strong> {viewing.codigo_estudiante}</p>
            <p><strong>Email:</strong> {viewing.email}</p>
            <p><strong>Teléfono:</strong> {viewing.telefono || '-'}</p>
            <p><strong>Año:</strong> {viewing.año_carrera}</p>
            <p><strong>Ciudad:</strong> {viewing.ciudad}</p>
            <p><strong>Universidad:</strong> {viewing.universidad || '-'}</p>
            <p><strong>Especialidades:</strong> {viewing.especialidades || '-'}</p>
            <p><strong>Casos activos:</strong> {viewing.casos_activos}/{viewing.casos_necesarios}</p>
            <p><strong>Casos completados:</strong> {viewing.casos_completados}</p>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          open
          title="Editar estudiante"
          onClose={() => setEditing(null)}
          footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={saveStudent} loading={saving}>Guardar</Button></>}
        >
          <form className="form-grid" onSubmit={saveStudent}>
            <Input label="Nombre completo" required value={editing.nombre_completo} onChange={event => setEditing({ ...editing, nombre_completo: event.target.value })} />
            <Input label="Email" type="email" required value={editing.email} onChange={event => setEditing({ ...editing, email: event.target.value })} />
            <Input label="Teléfono" value={editing.telefono || ''} onChange={event => setEditing({ ...editing, telefono: event.target.value })} />
            <Select label="Año de carrera" value={editing.año_carrera} onChange={event => setEditing({ ...editing, año_carrera: event.target.value })}>
              <option value="4to">4to</option><option value="5to">5to</option>
            </Select>
            <Input label="Universidad" value={editing.universidad || ''} onChange={event => setEditing({ ...editing, universidad: event.target.value })} />
            <Select label="Ciudad" value={editing.ciudad} onChange={event => setEditing({ ...editing, ciudad: event.target.value })}>
              {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
            </Select>
            <Input label="Carga máxima" type="number" min="1" max="50" value={editing.casos_necesarios} onChange={event => setEditing({ ...editing, casos_necesarios: event.target.value })} />
            <Select label="Estado" value={editing.estado} onChange={event => setEditing({ ...editing, estado: event.target.value })}>
              <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
            </Select>
          </form>
        </Modal>
      )}
    </div>
  );
}
