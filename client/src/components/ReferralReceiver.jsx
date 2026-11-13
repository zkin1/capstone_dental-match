import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Select } from './Field';

export default function ReferralReceiver({ assignmentId, specialty, value, onChange }) {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ especialidad: specialty });
    apiFetch('/asignaciones/' + assignmentId + '/derivacion/candidatos?' + query)
      .then(result => { if (active) setStudents(result.data); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [assignmentId, specialty]);

  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!students) return <p role="status">Buscando estudiantes compatibles…</p>;
  if (!students.length)
    return <p>Sin estudiantes compatibles. Puedes enviar la derivación a revisión sin receptor.</p>;

  const receiver = students.find(student => String(student.id) === value);
  return (
    <>
      <Select label="Estudiante receptor" value={value} onChange={e => onChange(e.target.value)}
        hint="Coordinación revisará tu propuesta antes de asignar el caso.">
        <option value="">Sin preferencia de receptor</option>
        {students.map(student => (
          <option key={student.id} value={student.id}>
            {student.nombre} · {student.casos_activos}/{student.casos_necesarios} casos
          </option>
        ))}
      </Select>
      {receiver && (
        <div className="case-section">
          <p>{receiver.clinica}</p>
          <ul>
            {[...receiver.horarios].sort((a, b) =>
              (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)
            ).map(slot => (
              <li key={slot.fecha + slot.inicio + slot.termino}>
                {slot.fecha.split('-').reverse().join('/')} · {slot.inicio.slice(0, 5)}–{slot.termino.slice(0, 5)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
