// Chip seleccionable accesible (fix A11Y-02): input real oculto con
// visually-hidden (sigue enfocable por teclado y visible para SR).
// El foco se muestra en el chip vía CSS :focus-within / :has.
export default function Chip({ type = 'checkbox', name, checked, onChange, children }) {
  return (
    <label className={`chip${checked ? ' checked' : ''}`}>
      <input
        className="visually-hidden"
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span>{children}</span>
    </label>
  );
}
