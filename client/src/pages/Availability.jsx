import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { Input, Select } from '../components/Field';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useToast } from '../components/toastContext';
import './Availability.css';

const endpoint = '/estudiantes/mi-disponibilidad';
const days = [
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'],
];
const dayLabel = value => days.find(([day]) => day === value)?.[1] || value;
const timeLabel = slot => `${slot.hora_inicio.slice(0, 5)} – ${slot.hora_fin.slice(0, 5)}`;
const dateLabel = date => new Date(date + 'T12:00:00').toLocaleDateString('es-CL', {
  day: 'numeric', month: 'long', year: 'numeric',
});

export default function Availability() {
  usePageTitle('Mi disponibilidad');
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [absence, setAbsence] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(endpoint, { signal: controller.signal })
      .then(result => setData(result.data))
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);

  const closeEditor = useCallback(() => {
    if (!saving) { setEditor(null); setError(''); }
  }, [saving]);
  const closeRemoval = useCallback(() => {
    if (!saving) { setRemoving(null); setError(''); }
  }, [saving]);

  async function save(path, method, body, message) {
    setSaving(true);
    setError('');
    try {
      await apiFetch(endpoint + path, { method, ...(body && { body: JSON.stringify(body) }) });
      setData((await apiFetch(endpoint)).data);
      toast.success(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openEditor(slot) {
    setError('');
    setEditor({
      id: slot?.id || null,
      clinica: slot?.clinica || data.clinicas[0],
      dias_semana: slot ? [slot.dia_semana] : [],
      hora_inicio: slot?.hora_inicio.slice(0, 5) || '08:00',
      hora_fin: slot?.hora_fin.slice(0, 5) || '12:00',
    });
  }

  async function submitSchedule(event) {
    event.preventDefault();
    if (!editor.dias_semana.length) { setError('Selecciona al menos un día de atención.'); return; }
    if (editor.hora_inicio >= editor.hora_fin) {
      setError('La hora de término debe ser posterior a la de inicio.');
      return;
    }
    const { id, ...body } = editor;
    if (await save('/horarios' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body,
      id ? 'Horario actualizado' : 'Horario añadido')) setEditor(null);
  }

  const clinics = data?.clinicas || [];
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });

  return (
    <div className="page availability-page">
      <div className="page-header availability-header">
        <div>
          <h1>Mi disponibilidad</h1>
          <p className="page-subtitle">Organiza tus días de atención en clínica.</p>
        </div>
        <Button icon="plus" disabled={!clinics.length || saving} onClick={() => openEditor()}>
          Añadir horario
        </Button>
      </div>

      {error && !editor && !removing && <p className="alert" role="alert">{error}</p>}
      {!data && !error && <p className="availability-loading" role="status">Cargando tu disponibilidad…</p>}
      {data && <>
        <section className="availability-section" aria-labelledby="weekly-title">
          <div className="availability-section-heading">
            <h2 id="weekly-title">Tu semana</h2>
            <p>Los cambios se aplican a nuevas asignaciones. Tus citas actuales se mantienen.</p>
          </div>
          {!clinics.length && <div className="availability-empty">
            <p>Tu perfil aún no tiene una clínica habilitada.</p>
            <p className="muted">Consulta con coordinación para comenzar a añadir horarios.</p>
          </div>}
          {clinics.map(clinic => {
            const slots = data.horarios.filter(slot => slot.clinica === clinic).sort((a, b) =>
              days.findIndex(([day]) => day === a.dia_semana) - days.findIndex(([day]) => day === b.dia_semana)
              || a.hora_inicio.localeCompare(b.hora_inicio));
            return <section className="availability-clinic" key={clinic} aria-label={clinic}>
              <h3>{clinic}</h3>
              {!slots.length ? <p className="availability-empty">Aún no tienes horarios para esta clínica. Añade tu primer bloque de atención.</p> :
                <ul className="availability-slots">
                  {slots.map(slot => <li className="availability-slot" key={slot.id}>
                    <div className="availability-slot-day"><Icon name="clock" size={20} />{dayLabel(slot.dia_semana)}</div>
                    <span className="availability-slot-time">{timeLabel(slot)}</span>
                    <div className="availability-slot-actions">
                      <Button variant="secondary" disabled={saving} onClick={() => openEditor(slot)}
                        aria-label={`Cambiar horario del ${dayLabel(slot.dia_semana)} ${timeLabel(slot)}`}>
                        Cambiar horario
                      </Button>
                      <Button variant="ghost" className="availability-remove" disabled={saving}
                        aria-label={`Quitar horario del ${dayLabel(slot.dia_semana)} ${timeLabel(slot)}`}
                        onClick={() => { setError(''); setRemoving(slot); }}>Quitar</Button>
                    </div>
                  </li>)}
                </ul>}
            </section>;
          })}
        </section>

        <section className="availability-section availability-absences" aria-labelledby="absences-title">
          <div className="availability-section-heading">
            <h2 id="absences-title">Días que no podrás asistir</h2>
            <p>Bloquea una fecha para que no te asignen nuevas citas ese día.</p>
          </div>
          <form className="availability-absence-form" onSubmit={async event => {
            event.preventDefault();
            if (await save('/ausencias/' + encodeURIComponent(absence), 'PUT', null, 'Fecha bloqueada')) setAbsence('');
          }}>
            <Input label="Fecha de ausencia" type="date" min={today} required value={absence}
              onChange={event => setAbsence(event.target.value)} />
            <Button type="submit" variant="secondary" disabled={saving || !absence}>Bloquear fecha</Button>
          </form>
          {!data.ausencias.length ? <p className="availability-empty-dates">No tienes fechas bloqueadas.</p> :
            <ul className="availability-dates">{data.ausencias.map(date => <li key={date}>
              <time dateTime={date}>{dateLabel(date)}</time>
              <Button variant="ghost" icon="close" disabled={saving} aria-label={`Quitar bloqueo del ${dateLabel(date)}`}
                onClick={() => save('/ausencias/' + date, 'DELETE', null, 'Fecha desbloqueada')} />
            </li>)}</ul>}
        </section>
      </>}

      <Modal open={Boolean(editor)} title={editor?.id ? 'Cambiar mi horario' : 'Añadir horario'} onClose={closeEditor}>
        {editor && <form className="availability-editor" onSubmit={submitSchedule}>
          <p className="availability-editor-description">Elige los días en que atenderás y el horario de ese bloque.</p>
          {error && <p className="alert" role="alert">{error}</p>}
          {clinics.length > 1 && !editor.id ?
            <Select label="Clínica" required value={editor.clinica} disabled={saving}
              onChange={event => setEditor({ ...editor, clinica: event.target.value })}>
              {clinics.map(clinic => <option key={clinic} value={clinic}>{clinic}</option>)}
            </Select> : <dl className="availability-editor-clinic"><dt>Clínica</dt><dd>{editor.clinica}</dd></dl>}
          <fieldset className="availability-days" disabled={saving}>
            <legend>Días de atención</legend>
            <div>{days.map(([day, label]) => <label key={day}>
              <input type="checkbox" checked={editor.dias_semana.includes(day)} onChange={event =>
                setEditor({ ...editor, dias_semana: event.target.checked
                  ? [...editor.dias_semana, day] : editor.dias_semana.filter(value => value !== day) })} />
              <span>{label}</span>
            </label>)}</div>
          </fieldset>
          <div className="availability-time-fields">
            <Input label="Desde" type="time" step="900" required disabled={saving} value={editor.hora_inicio}
              onChange={event => setEditor({ ...editor, hora_inicio: event.target.value })} />
            <Input label="Hasta" type="time" step="900" required disabled={saving} value={editor.hora_fin}
              onChange={event => setEditor({ ...editor, hora_fin: event.target.value })} />
          </div>
          <div className="availability-editor-actions">
            <Button type="button" variant="ghost" disabled={saving} onClick={closeEditor}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar horario</Button>
          </div>
        </form>}
      </Modal>
      <Modal open={Boolean(removing)} title="Quitar horario" onClose={closeRemoval}
        footer={<>
          <Button variant="secondary" disabled={saving} onClick={closeRemoval}>Cancelar</Button>
          <Button variant="danger" loading={saving} onClick={async () => {
            if (await save('/horarios/' + removing.id, 'DELETE', null, 'Horario quitado')) setRemoving(null);
          }}>Quitar horario</Button>
        </>}>
        {error && <p className="alert" role="alert">{error}</p>}
        {removing && <p>Se quitará el bloque del {dayLabel(removing.dia_semana).toLowerCase()}, de {timeLabel(removing)}. Las citas ya asignadas se mantienen.</p>}
      </Modal>
    </div>
  );
}
