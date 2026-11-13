const FILTERS = new Set(['todos', 'pendiente', 'revision', 'sin_contactar', 'cita_vencida']);

function caseQueueOptions(query = {}, pendingOnly = false) {
  const positiveInt = (value, fallback, max) =>
    typeof value === 'string' && /^[1-9]\d*$/.test(value)
      ? Math.min(Number(value), max)
      : fallback;
  return {
    search: typeof query.q === 'string' ? query.q.trim().slice(0, 120) : '',
    filter: FILTERS.has(query.filtro) ? query.filtro : 'todos',
    page: positiveInt(query.pagina, 1, 1_000_000),
    pageSize: positiveInt(query.limite, 20, 100),
    pendingOnly,
  };
}

module.exports = { caseQueueOptions };
