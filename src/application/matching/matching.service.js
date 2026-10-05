const scoring = require('../../domain/matching/scoring');

const { scorePatientCategory, calculateScore } = scoring;

function selectCandidate(patient, candidates, category) {
  const referred = Boolean(patient.derivacion_id && category.validated);
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      ...calculateScore(patient, candidate, category),
    }))
    .filter(
      (candidate) =>
        candidate.especialidad === category.specialty &&
        candidate.factors.horario >= (referred ? 1 : 0.01) &&
        (!patient.ciudad ||
          !candidate.ciudad ||
          patient.ciudad === candidate.ciudad) &&
        Number(candidate.casos_activos) < Number(candidate.casos_necesarios)
    )
    .sort(
      (a, b) =>
        (referred
          ? Number(a.casos_activos) - Number(b.casos_activos) ||
            Number(b.derivaciones_aprobadas || 0) -
              Number(a.derivaciones_aprobadas || 0)
          : 0) ||
        b.score - a.score ||
        a.casos_activos - b.casos_activos ||
        a.id_estudiante - b.id_estudiante ||
        a.id_especialidad_estudiante - b.id_especialidad_estudiante
    );
  const selected = ranked[0];
  if (!selected) return null;
  return {
    ...selected,
    factors: {
      ...selected.factors,
      politica: referred ? 'menor_carga_y_derivaciones_aprobadas' : 'ponderado',
      pacientes_activos: Number(selected.casos_activos),
      derivaciones_aprobadas: Number(selected.derivaciones_aprobadas || 0),
      motivo_reparto: referred
        ? 'Menor carga; a igual carga, más derivaciones aprobadas; luego compatibilidad'
        : 'Mayor compatibilidad ponderada',
    },
  };
}

function createMatchingService(repository) {
  if (!repository)
    throw new Error(
      'El servicio de matching requiere un adaptador de persistencia'
    );

  async function matchPatient(patientId) {
    return repository.matchPatient(
      patientId,
      scorePatientCategory,
      selectCandidate
    );
  }

  async function executeAdvancedMatching() {
    return repository.withMatchingLock(async () => {
      const patients = await repository.listPendingIds();
      const results = [];
      for (const patient of patients)
        results.push(await matchPatient(patient.id));
      const matches = results.filter((result) => result.success);
      return {
        success: true,
        processed: results.length,
        matched: matches.length,
        unmatched: results.length - matches.length,
        averageScore: matches.length
          ? Math.round(
              (matches.reduce((sum, result) => sum + result.score, 0) /
                matches.length) *
                10000
            ) / 10000
          : 0,
        matches,
        failures: results.filter((result) => !result.success),
      };
    });
  }

  return {
    ...scoring,
    matchPatient,
    executeAdvancedMatching,
    getStats: () => repository.getStats(),
    listPending: () => repository.listPending(),
    candidates: (patientId, assignmentId) =>
      repository.candidates(
        patientId,
        scorePatientCategory,
        selectCandidate,
        assignmentId
      ),
    manual: (patientId, input, user) =>
      repository.allocate(patientId, scorePatientCategory, selectCandidate, {
        manual: true,
        scheduleId: input.id_especialidad_estudiante,
        reason: input.motivo,
        user,
        assignmentId: input.id_asignacion,
      }),
  };
}

module.exports = { createMatchingService, selectCandidate, ...scoring };
