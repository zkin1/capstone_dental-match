import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import { Input, Select } from '../components/Field';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { displayLabel } from '../lib/labels';
import { useAuth } from '../hooks/authContext';
const EMPTY = {
  nombre: '',
  apellido: '',
  email: '',
  role: 'coordinator',
  password: '',
  confirmPassword: '',
};
export default function Users() {
  const { user, refreshUser } = useAuth();
  usePageTitle('Cuentas y roles');
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const load = useCallback(async () => {
    try {
      setRows((await apiFetch('/users')).data);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(editing || form),
      });
      const changedSelf = editing?.id === user.id;
      setEditing(null);
      setCreating(false);
      setForm(EMPTY);
      toast.success('Cuenta guardada');
      if (changedSelf) await refreshUser();
      else await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  const columns = [
    { key: 'nombre_completo', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rol', render: (u) => displayLabel(u.role) },
    { key: 'status', label: 'Estado', render: (u) => displayLabel(u.status) },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (u) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setError('');
            setEditing({
              id: u.id,
              nombre_completo: u.nombre_completo,
              role: u.role,
              status: u.status,
            });
          }}
        >
          Editar cuenta
        </Button>
      ),
    },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Cuentas y roles</h1>
          <p className="page-subtitle">
            Solo el administrador puede cambiar roles y suspender cuentas.
          </p>
        </div>
        <Button
          onClick={() => {
            setError('');
            setCreating(true);
          }}
        >
          Crear cuenta de personal
        </Button>
      </div>
      <p>
        Los estudiantes se crean con su perfil, especialidades y horarios en el{' '}
        <Link to="/registro-estudiante">registro de estudiantes</Link>.
      </p>
      {!rows && !error && <p role="status">Cargando cuentas…</p>}
      {error && !editing && !creating && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <Table
        columns={columns}
        rows={rows}
        keyFn={(u) => u.id}
        caption="Cuentas del sistema"
      />
      {(editing || creating) && (
        <Modal
          open
          title={editing ? 'Editar cuenta' : 'Crear cuenta de personal'}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={save}>
            {editing ? (
              <>
                <Input
                  label="Nombre completo"
                  required
                  minLength={3}
                  maxLength={150}
                  value={editing.nombre_completo}
                  onChange={(e) =>
                    setEditing({ ...editing, nombre_completo: e.target.value })
                  }
                />
                <Select
                  label="Rol"
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                >
                  <option value="admin">Administrador</option>
                  <option value="coordinator">Coordinador</option>
                  <option value="student">Estudiante (requiere perfil)</option>
                </Select>
                <Select
                  label="Estado de la cuenta"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="suspended">Suspendida</option>
                </Select>
                <p>
                  Los cambios de rol y estado se aplican inmediatamente. Siempre
                  debe quedar un administrador activo.
                </p>
              </>
            ) : (
              <>
                <div className="form-grid">
                  {[
                    'nombre',
                    'apellido',
                    'email',
                    'password',
                    'confirmPassword',
                  ].map((key) => (
                    <Input
                      key={key}
                      required
                      label={
                        {
                          nombre: 'Nombre',
                          apellido: 'Apellido',
                          email: 'Email',
                          password: 'Contraseña',
                          confirmPassword: 'Confirmar contraseña',
                        }[key]
                      }
                      type={
                        key === 'email'
                          ? 'email'
                          : key.includes('assword')
                            ? 'password'
                            : 'text'
                      }
                      autoComplete={
                        key.includes('assword') ? 'new-password' : undefined
                      }
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  ))}
                  <Select
                    label="Rol"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="coordinator">Coordinador</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </div>
                <p>
                  La contraseña necesita 8 caracteres, mayúscula, minúscula,
                  número y símbolo.
                </p>
              </>
            )}
            <Button type="submit" loading={saving}>
              Guardar cuenta
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
