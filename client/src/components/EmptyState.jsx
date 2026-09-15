import Icon from './Icon';

// Estado vacío consistente (fix UX-05): icono + título + descripción + acción opcional.
export default function EmptyState({ icon = 'info', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={44} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
