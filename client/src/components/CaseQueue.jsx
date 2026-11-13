import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Input, Select } from './Field';
import Badge from './Badge';
import Button from './Button';
import Table from './Table';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

export default function CaseQueue({ endpoint, pendingOnly = false, revision, columns }) {
  const [query, setQuery] = useState({ q: '', filtro: 'todos', pagina: 1 });
  const [loaded, setLoaded] = useState(null);
  const loading = loaded?.query !== query || loaded?.revision !== revision;
  const { result, error } = loading ? {} : loaded;

  useEffect(() => {
    const controller = new AbortController();
    function finish(payload) {
      if (!controller.signal.aborted) setLoaded({ query, revision, ...payload });
    }
    apiFetch(endpoint + '?' + new URLSearchParams(query), { signal: controller.signal })
      .then(result => finish({ result }))
      .catch(e => finish({ error: e.message }));
    return () => controller.abort();
  }, [endpoint, query, revision]);

  const pagination = result?.pagination;
  const pageCount = Math.max(1, Math.ceil((pagination?.total ?? 0) / (pagination?.pageSize ?? 20)));
  const page = pagination?.page ?? 1;
  const queueColumns = [
    { key: 'caso', label: 'Caso', render: row => <><strong>{row.nombre_completo}</strong><br />CASO-{String(row.id).padStart(6, '0')}</> },
    { key: 'prioridad', label: 'Prioridad', render: row => <Badge value={row.prioridad} /> },
    { key: 'seguimiento', label: 'Seguimiento', render: row => <>
      {row.requiere_revision ? <Badge value="Alta">Revisión clínica</Badge> : <Badge value={row.estado} />}
      {row.sin_contactar && <div>Sin contactar</div>}
      {row.cita_vencida && <div>Cita vencida</div>}
    </> },
    { key: 'motivo_matching', label: 'Motivo pendiente', render: row =>
      row.motivo_matching || (row.estado === 'pendiente' ? 'Aún sin resultado de matching' : '—') },
    ...columns,
  ];

  return (
    <section className="case-section" aria-label="Bandeja de casos">
      <form className="card form-card" onSubmit={event => {
        event.preventDefault();
        const q = String(new FormData(event.currentTarget).get('q') || '').trim();
        setQuery(current => ({ ...current, q, pagina: 1 }));
      }}>
        <div className="form-grid">
          <Input label="Buscar casos" name="q" type="search" maxLength={120} placeholder="Nombre, código, ciudad o especialidad" />
          <Select label="Filtrar casos" value={query.filtro} onChange={event =>
            setQuery({ ...query, filtro: event.target.value, pagina: 1 })}>
            <option value="todos">{pendingOnly ? 'Todos los pendientes' : 'Todos los casos'}</option>
            {!pendingOnly && <option value="pendiente">Pendientes de asignación</option>}
            <option value="revision">Revisión clínica</option>
            {!pendingOnly && <option value="sin_contactar">Sin contactar</option>}
            {!pendingOnly && <option value="cita_vencida">Cita vencida</option>}
          </Select>
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
      {loading ? (
        <><span className="visually-hidden" role="status">Cargando casos…</span><Skeleton variant="table" rows={5} /></>
      ) : !error && (
        <>
          <Table caption={pendingOnly ? 'Casos pendientes de matching' : 'Listado de pacientes'}
            columns={queueColumns} rows={result?.data} keyFn={row => row.id}
            empty={<EmptyState icon="users" title="No hay casos para esta búsqueda" />} />
          {pagination && <div className="table-actions" aria-label="Paginación de casos">
            <Button variant="secondary" size="sm" disabled={page <= 1}
              onClick={() => setQuery({ ...query, pagina: page - 1 })}>Anterior</Button>
            <span role="status">Página {page} de {pageCount} · {pagination.total} casos</span>
            <Button variant="secondary" size="sm" disabled={page >= pageCount}
              onClick={() => setQuery({ ...query, pagina: page + 1 })}>Siguiente</Button>
          </div>}
        </>
      )}
    </section>
  );
}
