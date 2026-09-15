const scoring = require('../../domain/matching/scoring');

const {
  scorePatientCategory, calculateScore,
} = scoring;

function selectCandidate(patient, candidates, category) {
  const ranked = candidates
    .map(candidate => ({ ...candidate, ...calculateScore(patient, candidate, category) }))
    .filter(candidate => candidate.factors.horario > 0)
    .sort((a, b) => b.score - a.score || a.casos_activos - b.casos_activos || a.id_estudiante - b.id_estudiante);
  return ranked[0] || null;
}

function createMatchingService(repository) {
  if (!repository) throw new Error('El servicio de matching requiere un adaptador de persistencia');

  async function matchPatient(patientId) {
    return repository.matchPatient(patientId, scorePatientCategory, selectCandidate);
  }

  async function executeAdvancedMatching() {
    return repository.withMatchingLock(async () => {
      const patients = await repository.listPendingIds();
      const results = [];
      for (const patient of patients) results.push(await matchPatient(patient.id));
      const matches = results.filter(result => result.success);
      return {
        success: true,
        processed: results.length,
        matched: matches.length,
        unmatched: results.length - matches.length,
        averageScore: matches.length
          ? Math.round(matches.reduce((sum, result) => sum + result.score, 0) / matches.length * 10000) / 10000
          : 0,
        matches,
        failures: results.filter(result => !result.success),
      };
    });
  }

  return {
    ...scoring,
    matchPatient,
    executeAdvancedMatching,
    getStats: () => repository.getStats(),
    listPending: () => repository.listPending(),
  };
}

module.exports = { createMatchingService, ...scoring };
