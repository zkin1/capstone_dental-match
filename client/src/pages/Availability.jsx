import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { Input, Select } from '../components/Field';
import Button from '../components/Button';
import { useToast } from '../components/toastContext';

const endpoint = '/estudiantes/mi-disponibilidad';
const days = [
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'],
];

export default function Availability() {
  usePageTitle('Mi disponibilidad');
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(endpoint).then(result => setData(result.data)).catch(e => setError(e.message));
  }, []);

  async function save(path, method, body) {
    setSaving(true);
    setError('');
    try {
      await apiFetch(endpoint + path, { method, ...(body && { body: JSON.stringify(body) }) });
      setData((await apiFetch(endpoint)).data);
      toast.success('Disponibilidad guardada');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Mi disponibilidad</h1>
          <p className="page-subtitle">Los cambios de horario se aplican a futuras asignaciones.</p>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {!data && !error && <p role="status">Cargando disponibilidad…</p>}
      {data && <>
        <section className="card case-section">
          <h2>Horarios semanales</h2>
          {!data.horarios.length && <p>No tienes horarios activos. Consulta con coordinación.</p>}
          {data.horarios.map((slot) => (
            <form key={slot.id} className="case-section" onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              save('/horarios/' + slot.id, 'PUT', Object.fromEntries(fields));
            }}>
              <h3>{slot.especialidad}</h3>
              <p className="muted">{slot.clinica}</p>
              <div className="form-grid">
                <Select label="Día" name="dia_semana" defaultValue={slot.dia_semana}>
                  {days.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
                <Input label="Inicio" name="hora_inicio" type="time" defaultValue={slot.hora_inicio.slice(0, 5)} required />
                <Input label="Término" name="hora_fin" type="time" defaultValue={slot.hora_fin.slice(0, 5)} required />
              </div>
              <Button type="submit" disabled={saving}>Guardar horario</Button>
            </form>
          ))}
        </section>
        <section className="card case-section">
          <h2>Ausencias</h2>
          <form onSubmit={(event) => {
            event.preventDefault();
            const date = new FormData(event.currentTarget).get('fecha');
            if (!date) {
              setError('Selecciona una fecha válida');
              return;
            }
            save('/ausencias/' + encodeURIComponent(date), 'PUT');
          }}>
            <Input label="Fecha de ausencia" name="fecha" type="date" required />
            <Button type="submit" disabled={saving}>Bloquear fecha</Button>
          </form>
          {data.ausencias.length === 0 && <p>No tienes fechas bloqueadas.</p>}
          <ul>
            {data.ausencias.map(day => (
              <li key={day}>
                <time dateTime={day}>{day.split('-').reverse().join('/')}</time>{' '}
                <Button type="button" variant="ghost" disabled={saving} onClick={() => save('/ausencias/' + day, 'DELETE')}>
                  Quitar bloqueo
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </>}
    </div>
  );
}
