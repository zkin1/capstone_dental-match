import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/authContext';
import { useToast } from './toastContext';
import { Input, Select, Textarea } from './Field';
import Button from './Button';
import Badge from './Badge';
import Modal from './Modal';
import QualificationFields from './QualificationFields';
import ManualAssignment from './ManualAssignment';
import ReferralReceiver from './ReferralReceiver';
import { displayLabel as label } from '../lib/labels';

const NEXT = {
  asignado: ['notificado', 'contactado', 'cancelado'],
  notificado: ['contactado', 'cancelado'],
  contactado: ['en_tratamiento', 'cancelado'],
  en_tratamiento: ['completado', 'cancelado'],
};
const date = (value) => new Date(value).toLocaleString('es-CL');
const CONTACT_OUTCOMES = ['sin_respuesta', 'contactado', 'acepta', 'pide_reprogramar', 'rechaza'];
const EMPTY_FOLLOWUP = { resultado: '', motivo: '', proxima_fecha: '', fecha_acordada: '' };

function FollowUpSummary({ value }) {
  const formatDay = (day) => day.split('-').reverse().join('/');
  return (
    <dl className="case-data">
      <dt>Resultado de contacto</dt><dd>{label(value.resultado)}</dd>
      {value.motivo && <><dt>Motivo</dt><dd>{value.motivo}</dd></>}
      {value.proxima_fecha && <><dt>Próximo seguimiento</dt><dd>{formatDay(value.proxima_fecha)}</dd></>}
      {value.fecha_acordada && <><dt>Fecha acordada</dt><dd>{formatDay(value.fecha_acordada)}</dd></>}
    </dl>
  );
}
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
  const [cancellationReason, setCancellationReason] = useState('');
  const [followUp, setFollowUp] = useState(EMPTY_FOLLOWUP);
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
      setCancellationReason('');
      setFollowUp(EMPTY_FOLLOWUP);
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
      id_estudiante_destino: nextMode === 'review' && initial?.receptor ? String(initial.receptor.id) : '',
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
  const cancelling = state === 'cancelado' && assignment?.estado !== 'cancelado';
  const activeAssignment =
    assignment &&
    !['derivado', 'completado', 'cancelado', 'derivacion_pendiente'].includes(
      assignment.estado
    );
  const lastFollowUp = assignment && detail.historial.findLast(event =>
    event.id_asignacion === assignment.id && event.datos?.seguimiento
  )?.datos.seguimiento;
  const canFollowUp = activeAssignment && !['cancelado', 'completado'].includes(state);
  const recordingFollowUp = canFollowUp && Boolean(followUp.resultado);
  const needsReason = ['pide_reprogramar', 'rechaza'].includes(followUp.resultado);
  const hasAgreedDate = !['sin_respuesta', 'rechaza'].includes(followUp.resultado);
  const setFollowUpValue = (key, value) => setFollowUp(previous => ({ ...previous, [key]: value }));
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
                <dt>Clínica</dt>
                <dd>{assignment.clinica_asignada || 'Por confirmar con coordinación'}</dd>
                {assignment.motivo_cancelacion && (
                  <>
                    <dt>Motivo de cancelación</dt>
                    <dd>{assignment.motivo_cancelacion}</dd>
                  </>
                )}
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
          {detail.sugerencia.reviewReason && (
            <p className="alert" role="status">
              {detail.sugerencia.reviewReason}.
              {!detail.validacion && ' Revisa la precalificación antes de asignar este caso.'}
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
              <h3>Seguimiento del paciente</h3>
              {lastFollowUp && <FollowUpSummary value={lastFollowUp} />}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  perform(
                    `/asignaciones/${assignment.id}`,
                    'PUT',
                    {
                      estado: state,
                      ...(cancelling ? { motivo_cancelacion: cancellationReason.trim() } : {}),
                      ...(recordingFollowUp ? { seguimiento: {
                        ...followUp,
                        proxima_fecha: followUp.proxima_fecha || null,
                        fecha_acordada: hasAgreedDate ? followUp.fecha_acordada || null : null,
                      } } : {}),
                      ...(!cancelling && note.trim()
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
                {cancelling ? (
                  <Textarea
                    label="Motivo de cancelación"
                    required
                    minLength={5}
                    maxLength={2000}
                    rows={3}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    hint="El caso volverá a la cola de pacientes pendientes."
                  />
                ) : (
                  <Textarea
                    label="Nueva nota de seguimiento"
                    rows={3}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    hint="Cada nota se conserva en el historial con tu nombre y fecha."
                  />
                )}
                {canFollowUp && (
                  <>
                    <Select label="Resultado de contacto" value={followUp.resultado} onChange={(e) =>
                      setFollowUp(previous => ({ ...previous, resultado: e.target.value, fecha_acordada: '' }))
                    }>
                      <option value="">Seleccionar resultado</option>
                      {CONTACT_OUTCOMES.map(outcome => <option key={outcome} value={outcome}>{label(outcome)}</option>)}
                    </Select>
                    {recordingFollowUp && (
                      <>
                        <Textarea label="Motivo del seguimiento" required={needsReason}
                          minLength={needsReason ? 5 : undefined} maxLength={2000} rows={2}
                          value={followUp.motivo} onChange={(e) => setFollowUpValue('motivo', e.target.value)} />
                        <Input type="date" label="Próxima fecha de seguimiento" value={followUp.proxima_fecha}
                          onChange={(e) => setFollowUpValue('proxima_fecha', e.target.value)} />
                        {hasAgreedDate && <Input type="date" label="Fecha acordada" value={followUp.fecha_acordada}
                          onChange={(e) => setFollowUpValue('fecha_acordada', e.target.value)} />}
                      </>
                    )}
                  </>
                )}
                <Button
                  type="submit"
                  loading={saving}
                  disabled={cancelling ? cancellationReason.trim().length < 5
                    : state === assignment.estado && !note.trim() && !recordingFollowUp}
                >
                  Guardar seguimiento
                </Button>
              </form>
            </section>
          )}
          {['asignado', 'notificado'].includes(assignment?.estado) && (
            <p>Para derivar este caso, registra primero que contactaste al paciente.</p>
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
                  Derivar caso
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
              (!detail.sugerencia.reviewReason || detail.validacion) &&
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
              {pending.propuesta.receptor && <p>Receptor propuesto: {pending.propuesta.receptor.nombre}</p>}
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
                    <option value="aprobada">
                      Aprobar derivación
                    </option>
                    <option value="rechazada">
                      Rechazar y devolver al seguimiento
                    </option>
                  </Select>
                )}
                {(mode !== 'review' || decision === 'aprobada') && (
                  <QualificationFields value={draft} onChange={(updated) => setDraft(
                    updated.specialty === draft.specialty
                      ? updated
                      : { ...updated, id_estudiante_destino: '' }
                  )} />
                )}
                {(mode === 'refer' || (mode === 'review' && decision === 'aprobada')) && (
                  <ReferralReceiver
                    key={(mode === 'review' ? pending.id_asignacion_origen : assignment.id) + ':' + draft.specialty}
                    assignmentId={mode === 'review' ? pending.id_asignacion_origen : assignment.id}
                    reviewing={mode === 'review'}
                    specialty={draft.specialty}
                    value={draft.id_estudiante_destino || ''}
                    onChange={(id) => setDraft(currentDraft => ({ ...currentDraft, id_estudiante_destino: id }))}
                  />
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
                  {event.datos?.seguimiento && <FollowUpSummary value={event.datos.seguimiento} />}
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
