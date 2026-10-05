import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import Icon from '../components/Icon';
import StudentRegistrationForm from '../components/StudentRegistrationForm';

function RegistroAside() {
  return (
    <aside className="registro-aside">
      <Link to="/landing" className="public-brand" aria-label="Dental Match, inicio">
        <span className="public-brand-mark"><Icon name="tooth" size={18} /></span>
        <span>Dental Match</span>
      </Link>
      <div>
        <h2>Encuentra casos para seguir aprendiendo.</h2>
        <p>Cuéntanos qué áreas puedes atender y cuándo tienes disponibilidad para buscar casos que se ajusten a tu formación.</p>
        <ul className="registro-benefits">
          <li><Icon name="check-circle" size={16} /> Casos relacionados con tu formación.</li>
          <li><Icon name="check-circle" size={16} /> Horarios claros para facilitar la coordinación.</li>
          <li><Icon name="check-circle" size={16} /> Seguimiento de tus pacientes y asignaciones.</li>
        </ul>
        <p className="registro-trust">Tu perfil quedará disponible cuando completes toda la información.</p>
      </div>
    </aside>
  );
}

export default function RegistroEstudiante() {
  usePageTitle('Crear perfil clínico');
  const [resultado, setResultado] = useState(null);

  function created(student) {
    setResultado(student);
    window.scrollTo(0, 0);
  }

  return (
    <div className="registro-page">
      <div className={`registro-shell${resultado ? ' registro-shell-confirmation' : ''}`}>
        <RegistroAside />
        <div className="registro-container">
          {resultado ? (
            <div className="card confirmation-card dm-enter">
              <div className="confirmation-icon"><Icon name="check-circle" size={56} /></div>
              <h2>¡Listo! Tu perfil está creado.</h2>
              <p>Este es tu código de estudiante:</p>
              <p className="confirmation-code">{resultado.codigo_estudiante}</p>
              <p className="muted">Ya puedes iniciar sesión con el email y la contraseña que registraste.</p>
              <Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
            </div>
          ) : (
            <>
              <header className="registro-header">
                <Link to="/landing" className="registro-back"><Icon name="arrow-left" size={16} /> Volver</Link>
                <div className="registro-title-icon"><Icon name="grad-cap" size={26} /></div>
                <h1>Crea tu perfil clínico</h1>
                <p className="muted">Indica las áreas que puedes atender y tus horarios disponibles para recibir casos acordes a tu formación.</p>
              </header>
              <StudentRegistrationForm onCreated={created} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
