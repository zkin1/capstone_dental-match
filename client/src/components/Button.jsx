import Icon from './Icon';

// Botón del sistema. Variantes: primary | secondary | danger | ghost | outline (sobre fondo oscuro).
// `loading` deshabilita y muestra spinner. Para enlaces con pinta de botón usar className="btn btn-*" en <Link>.
export default function Button({ variant = 'primary', size, loading = false, icon, children, className = '', ...rest }) {
  return (
    <button
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''}${className ? ` ${className}` : ''}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
