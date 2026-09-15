// Tabla de datos. Desktop: <table> nativa. <640px: tarjetas apiladas vía CSS
// usando data-label en cada celda. `columns`: [{ key, label, render? }].
// `empty`: nodo (EmptyState) cuando no hay filas.
export default function Table({ caption, columns, rows, keyFn, empty }) {
  if (!rows || rows.length === 0) return empty ?? null;
  return (
    <div className="table-container">
      <table>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={keyFn ? keyFn(row) : i}>
              {columns.map(c => (
                <td key={c.key} data-label={c.label}>
                  {c.render ? c.render(row) : (row[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
