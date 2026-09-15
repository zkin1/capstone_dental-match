import { statusVariant } from '../styles/design-system';

// Badge de estado/urgencia. Normaliza las claves mixtas es/en de la API
// vía statusVariant() (fix A11Y-13). Significado siempre por texto + color.
export default function Badge({ value, children }) {
  const variant = statusVariant(value);
  return <span className={`badge badge-${variant}`}>{children ?? value ?? '-'}</span>;
}
