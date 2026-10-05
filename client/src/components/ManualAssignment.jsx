import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Select, Textarea } from './Field';
import Button from './Button';
import { useToast } from './toastContext';

export default function ManualAssignment({ patientId, assignmentId, onSaved }) {
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => {
    let active = true;
    apiFetch(
      `/matching/candidatos/${patientId}${assignmentId ? `?asignacion=${assignmentId}` : ''}`
    )
      .then((r) => {
        if (active) {
          setCandidates(r.data);
          setSelected(String(r.data[0]?.id_especialidad_estudiante || ''));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [patientId, assignmentId]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/matching/manual/${patientId}`, {
        method: 'POST',
        body: JSON.stringify({
          id_especialidad_estudiante: selected,
          id_asignacion: assignmentId,
          motivo: reason,
        }),
      });
      toast.success(assignmentId ? 'Paciente reasignado' : 'Paciente asignado');
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="case-section">
      <h3>{assignmentId ? 'Reasignar estudiante' : 'Asignar estudiante'}</h3>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!candidates && !error && (
        <p role="status">Buscando estudiantes compatibles…</p>
      )}
      {candidates?.length === 0 && (
        <p>
          No hay estudiantes compatibles con cupo. El paciente conserva su
          situación actual.
        </p>
      )}
      {candidates?.length > 0 && (
        <form onSubmit={save}>
          <Select
            label="Estudiante y horario disponible"
            required
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {candidates.map((c) => (
              <option
                key={c.id_especialidad_estudiante}
                value={c.id_especialidad_estudiante}
              >
                {c.nombre_completo} · {c.dia_semana} {c.hora_inicio} ·{' '}
                {c.casos_activos} activos · {c.derivaciones_aprobadas}{' '}
                derivaciones aprobadas
              </option>
            ))}
          </Select>
          <Textarea
            label="Motivo de la asignación manual"
            required
            minLength={5}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" loading={saving}>
            {assignmentId ? 'Confirmar reasignación' : 'Confirmar asignación'}
          </Button>
        </form>
      )}
    </section>
  );
}
