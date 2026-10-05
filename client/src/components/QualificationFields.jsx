import { Input, Select, Textarea } from './Field';
const SPECIALTIES = [
  'Endodoncia',
  'Operatoria Dental',
  'Ortodoncia',
  'Periodoncia',
  'Cirugía Oral',
  'Odontopediatría',
  'Prótesis Fija',
  'Prótesis Removible',
];
const PRIORITIES = ['Baja', 'Moderada', 'Alta', 'Muy Alta'];
export default function QualificationFields({ value, onChange }) {
  const change = (key, event) =>
    onChange({ ...value, [key]: event.target.value });
  return (
    <div className="form-grid">
      <Select
        label="Especialidad de destino"
        required
        value={value.specialty}
        onChange={(e) => change('specialty', e)}
      >
        {SPECIALTIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
      <Select
        label="Prioridad"
        required
        value={value.priority}
        onChange={(e) => change('priority', e)}
      >
        {PRIORITIES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </Select>
      <Input
        label="Tratamiento que necesita"
        required
        minLength={3}
        maxLength={500}
        value={value.treatment}
        onChange={(e) => change('treatment', e)}
      />
      <Textarea
        label="Motivo de la clasificación o derivación"
        required
        minLength={5}
        maxLength={2000}
        rows={3}
        value={value.reason}
        onChange={(e) => change('reason', e)}
      />
    </div>
  );
}
