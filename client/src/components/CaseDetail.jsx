import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/authContext';
import { useToast } from './toastContext';
import { Select, Textarea } from './Field';
import Button from './Button';
import Badge from './Badge';
import Modal from './Modal';
import QualificationFields from './QualificationFields';
import ManualAssignment from './ManualAssignment';
import { displayLabel as label } from '../lib/labels';

const NEXT = {
  asignado: ['notificado', 'contactado', 'cancelado'],
  notificado: ['contactado', 'cancelado'],
  contactado: ['en_tratamiento', 'cancelado'],
  en_tratamiento: ['completado', 'cancelado'],
};
const date = (value) => new Date(value).toLocaleString('es-CL');
function Classification({ title, value }) {
  return (
    <section className="case-section">
      <h3>{title}</h3>
      {value ? (
        <dl className="case-data">
          <dt>Especialidad</dt>
          <dd>{value.specialty}</dd>
          <dt>Tratamiento</dt>
          <dd>{value.treatment || 'Evaluación por confirmar'}</dd>
          <dt>Prioridad</dt>
          <dd>{value.priority}</dd>
          <dt>Motivo</dt>
          <dd>{value.reason}</dd>
          {value.reviewer && (
            <>
              <dt>Revisado por</dt>
              <dd>
                {value.reviewer} · {date(value.reviewedAt)}
              </dd>
            </>
          )}
        </dl>
      ) : (
        <p>Pendiente de revisión.</p>
      )}
    </section>
  );
}

export default function CaseDetail({
  assignmentId,
  patientId,
  onClose,
  onChanged,
}) {
  const { user } = useAuth();
  const staff = user?.role !== 'student';
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('');
  const [draft, setDraft] = useState(null);
  const [decision, setDecision] = useState('aprobada');
  const [reviewNote, setReviewNote] = useState('');
  const endpoint = assignmentId
    ? `/asignaciones/${assignmentId}/detalle`
    : `/pacientes/${patientId}`;
  const load = useCallback(async () => {
    try {
      const result = await apiFetch(endpoint);
      setDetail(result.data);
      setState(result.data.asignacion?.estado || '');
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [endpoint]);
  useEffect(() => {
    load();
  }, [load]);
  async function perform(path, method, body, message) {
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch(path, {
        method,
        body: JSON.stringify(body),
      });
      toast.success(message);
      if (response.data?.matching?.success === false)
        toast.info(response.data.matching.reason);
      setMode('');
      setNote('');
      setReviewNote('');
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function openForm(nextMode, initial) {
    setMode(nextMode);
    setDraft({
      specialty: 'Operatoria Dental',
      priority: 'Moderada',
      treatment: '',
      reason: '',
      ...initial,
    });
  }
  const patient = detail?.paciente;
  const assignment = detail?.asignacion;
  const current = detail?.asignaciones.find(
    (a) => !['derivado', 'completado', 'cancelado'].includes(a.estado)
  );
  const pending = detail?.derivaciones.find((d) => d.estado === 'pendiente');
  const answers =
    patient?.respuestas_cuestionario || patient?.sintomas_seleccionados || {};
  const nextStates = (NEXT[assignment?.estado] || []).filter(
    (s) => staff || s !== 'notificado'
  );
  const activeAssignment =
    assignment &&
    !['derivado', 'completado', 'cancelado', 'derivacion_pendiente'].includes(
      assignment.estado
    );
  const manualAssignment = activeAssignment
    ? assignment
    : current?.estado !== 'derivacion_pendiente'
      ? current
      : null;
  return (
    <Modal open title="Detalle del caso" onClose={onClose}>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!detail && !error && <p role="status">Cargando caso…</p>}
      {patient && (
        <div className="case-detail">
          <h3>
            {patient.nombre_completo} · CASO-
            {String(patient.id).padStart(6, '0')}
          </h3>
          <dl className="case-data">
            <dt>Teléfono</dt>
            <dd>
              <a href={`tel:${patient.telefono}`}>{patient.telefono}</a>
            </dd>
            <dt>Email</dt>
            <dd>
              {patient.email ? (
                <a href={`mailto:${patient.email}`}>{patient.email}</a>
              ) : (
                'No informado'
              )}
            </dd>
            <dt>Edad y ciudad</dt>
            <dd>
              {patient.edad} años · {patient.ciudad}
            </dd>
            <dt>Dolor informado</dt>
            <dd>{patient.nivel_dolor}/10</dd>
            {assignment && (
              <>
                <dt>Estudiante de esta asignación</dt>
                <dd>
                  {assignment.estudiante_nombre} ·{' '}
                  <Badge value={assignment.estado}>
                    {label(assignment.estado)}
                  </Badge>
                </dd>
                <dt>Cita propuesta</dt>
                <dd>
                  {String(assignment.fecha_cita).slice(0, 10)} ·{' '}
                  {assignment.dia_semana_asignado}{' '}
                  {assignment.hora_inicio_asignada}–
                  {assignment.hora_fin_asignada}
                </dd>
              </>
            )}
          </dl>
          {current && current.id !== assignment?.id && (
            <p>
              <strong>Estudiante asignado actualmente:</strong>{' '}
              {current.estudiante_nombre} · {current.especialidad_asignada} ·{' '}
              {label(current.estado)}
            </p>
          )}
          <Classification
            title="Precalificación sugerida por el sistema"
            value={detail.sugerencia}
          />
          {detail.sugerencia.redFlag && (
            <p className="alert" role="status">
              El cuestionario contiene una alerta clínica que requiere
              evaluación urgente.
            </p>
          )}
          <Classification
            title="Clasificación revisada por el personal"
            value={detail.validacion}
          />
          <details className="case-section">
            <summary>Resumen del caso y respuestas del cuestionario</summary>
            <dl className="case-data">
              {Object.entries(answers).map(([key, value]) => (
                <div className="case-answer" key={key}>
                  <dt>{label(key)}</dt>
                  <dd>
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {patient.pre_categorizacion_ia && (
              <details>
                <summary>Datos normalizados del análisis</summary>
                <dl className="case-data">
                  {Object.entries(patient.pre_categorizacion_ia).map(
                    ([key, value]) => (
                      <div className="case-answer" key={key}>
                        <dt>{label(key)}</dt>
                        <dd>
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </details>
            )}
          </details>

          {assignment && (
            <section className="case-section">
              <h3>Seguimiento</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  perform(
                    `/asignaciones/${assignment.id}`,
                    'PUT',
                    {
                      estado: state,
                      ...(note.trim()
                        ? { observaciones_estudiante: note.trim() }
                        : {}),
                    },
                    'Seguimiento guardado'
                  );
                }}
              >
                <Select
                  label="Estado del caso"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {[assignment.estado, ...nextStates].map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
                <Textarea
                  label="Nueva nota de seguimiento"
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  hint="Cada nota se conserva en el historial con tu nombre y fecha."
                />
                <Button
                  type="submit"
                  loading={saving}
                  disabled={state === assignment.estado && !note.trim()}
                >
                  Guardar seguimiento
                </Button>
              </form>
            </section>
          )}
          <div className="table-actions">
            {assignment &&
              ['contactado', 'en_tratamiento'].includes(assignment.estado) && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    openForm('refer', detail.validacion || detail.sugerencia)
                  }
                >
                  Registrar derivación
                </Button>
              )}
            {staff && !pending && patient.activo && (
              <Button
                variant="secondary"
                onClick={() =>
                  openForm('qualify', detail.validacion || detail.sugerencia)
                }
              >
                Revisar precalificación
              </Button>
            )}
            {staff && pending && (
              <Button onClick={() => openForm('review', pending.propuesta)}>
                Revisar derivación
              </Button>
            )}
            {staff &&
              patient.activo &&
              (manualAssignment || patient.estado === 'pendiente') && (
                <Button variant="secondary" onClick={() => setMode('manual')}>
                  {manualAssignment
                    ? 'Reasignar estudiante'
                    : 'Asignar estudiante'}
                </Button>
              )}
          </div>
          {pending && (
            <section className="case-section">
              <h3>Derivación pendiente de revisión</h3>
              <p>
                {pending.propuesta.treatment} · {pending.propuesta.specialty} ·{' '}
                {pending.propuesta.priority}
              </p>
              <p>{pending.propuesta.reason}</p>
              <p>
                El cupo de origen se conserva hasta que el personal revise la
                propuesta.
              </p>
            </section>
          )}
          {draft && ['refer', 'qualify', 'review'].includes(mode) && (
            <section className="case-section">
              <h3>
                {mode === 'refer'
                  ? 'Propuesta después de revisar el caso'
                  : mode === 'review'
                    ? 'Revisión de la derivación'
                    : 'Confirmar o corregir la clasificación'}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mode === 'refer')
                    perform(
                      `/asignaciones/${assignment.id}/derivacion`,
                      'POST',
                      draft,
                      'Derivación registrada para revisión'
                    );
                  else if (mode === 'qualify')
                    perform(
                      `/pacientes/${patient.id}/precalificacion`,
                      'PUT',
                      draft,
                      'Clasificación validada'
                    );
                  else
                    perform(
                      `/derivaciones/${pending.id}/revision`,
                      'POST',
                      {
                        ...draft,
                        estado: decision,
                        motivo_revision: reviewNote,
                      },
                      'Derivación revisada'
                    );
                }}
              >
                {mode === 'review' && (
                  <Select
                    label="Decisión"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <option value="aprobada">Aprobar y buscar receptor</option>
                    <option value="rechazada">
                      Rechazar y devolver al seguimiento
                    </option>
                  </Select>
                )}
                {(mode !== 'review' || decision === 'aprobada') && (
                  <QualificationFields value={draft} onChange={setDraft} />
                )}
                {mode === 'review' && (
                  <Textarea
                    label="Motivo de la revisión"
                    required
                    minLength={5}
                    maxLength={2000}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                )}
                <div className="table-actions">
                  <Button type="submit" loading={saving}>
                    Guardar {mode === 'refer' ? 'propuesta' : 'revisión'}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setMode('')}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </section>
          )}
          {mode === 'manual' && (
            <ManualAssignment
              patientId={patient.id}
              assignmentId={manualAssignment?.id}
              onSaved={async () => {
                setMode('');
                await load();
                await onChanged?.();
              }}
            />
          )}
          <section className="case-section">
            <h3>Historial del paciente</h3>
            {!detail.historial.length && (
              <p>Sin eventos registrados todavía.</p>
            )}
            <ol className="case-history">
              {detail.historial.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{label(event.tipo)}</strong> ·{' '}
                    <time dateTime={event.fecha}>{date(event.fecha)}</time>
                  </div>
                  <div>
                    {event.responsable} ({label(event.rol)})
                    {event.id_asignacion
                      ? ` · asignación ${event.id_asignacion}`
                      : ''}
                  </div>
                  {event.estado_nuevo && (
                    <p>
                      {label(event.estado_anterior)}
                      {event.estado_anterior ? ' → ' : ''}
                      {label(event.estado_nuevo)}
                    </p>
                  )}
                  {event.nota && <p className="case-note">{event.nota}</p>}
                  {event.datos?.validacion && (
                    <p>
                      {event.datos.validacion.treatment} ·{' '}
                      {event.datos.validacion.specialty} ·{' '}
                      {event.datos.validacion.priority}
                    </p>
                  )}
                  {event.datos?.factores && (
                    <p>
                      {event.datos.factores.motivo_reparto};{' '}
                      {event.datos.factores.pacientes_activos} pacientes
                      activos, {event.datos.factores.derivaciones_aprobadas}{' '}
                      derivaciones aprobadas.
                    </p>
                  )}
                  {event.datos?.estudiante && (
                    <p>Receptor: {event.datos.estudiante}</p>
                  )}
                  {event.tipo === 'snapshot_migracion' && (
                    <p>
                      Estado conservado al incorporar el historial; los cambios
                      anteriores no estaban registrados.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
}
