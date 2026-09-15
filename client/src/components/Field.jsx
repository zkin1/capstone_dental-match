import { useId } from 'react';

// Campos de formulario con label SIEMPRE asociado (fix A11Y-01), error inline
// con role="alert" y hint opcional. Tamaño de fuente ≥16px en CSS (fix iOS zoom).

export function Input({ label, error, hint, required, className = '', id, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label htmlFor={fid}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input id={fid} required={required} aria-invalid={!!error} aria-describedby={desc} {...rest} />
      {error && <p className="field-error-msg" role="alert" id={`${fid}-err`}>{error}</p>}
      {!error && hint && <p className="field-hint" id={`${fid}-hint`}>{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, required, options, className = '', id, children, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label htmlFor={fid}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <select id={fid} required={required} aria-invalid={!!error} aria-describedby={desc} {...rest}>
        {children ?? options?.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="field-error-msg" role="alert" id={`${fid}-err`}>{error}</p>}
      {!error && hint && <p className="field-hint" id={`${fid}-hint`}>{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, required, className = '', id, ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label htmlFor={fid}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <textarea id={fid} required={required} aria-invalid={!!error} aria-describedby={desc} {...rest} />
      {error && <p className="field-error-msg" role="alert" id={`${fid}-err`}>{error}</p>}
      {!error && hint && <p className="field-hint" id={`${fid}-hint`}>{hint}</p>}
    </div>
  );
}
