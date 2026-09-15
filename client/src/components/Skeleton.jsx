// Placeholders de carga (fix UX-04). Decorativos para SR: el texto
// "Cargando…" lo aporta el contenedor `.loading` o el aria-live de la página.
export default function Skeleton({ variant = 'table', rows = 4 }) {
  if (variant === 'cards') {
    return (
      <div className="stats-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card skeleton-card">
            <div className="skeleton" style={{ width: '50%', height: 13 }} />
            <div className="skeleton" style={{ width: '35%', height: 32, marginTop: 12 }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="card" aria-hidden="true" style={{ padding: 20 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 16, margin: '14px 0', width: `${92 - i * 7}%` }} />
      ))}
    </div>
  );
}
