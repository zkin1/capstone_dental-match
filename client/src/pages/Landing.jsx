import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import Icon from '../components/Icon';

export default function Landing() {
  usePageTitle('Bienvenido');

  return (
    <div className="landing-page landing-v2">
      <header className="landing-hero">
        <img
          className="landing-hero-image"
          src="/images/dental-matching-hero.png"
          alt="Estudiante de odontología conversando con una paciente antes de una atención"
        />
        <div className="landing-hero-tint" aria-hidden="true" />
        <nav className="landing-nav" aria-label="Navegación pública">
          <Link to="/landing" className="landing-brand" aria-label="Dental Matching, inicio">
            <span className="landing-brand-mark"><Icon name="tooth" size={21} /></span>
            <span>Dental Matching</span>
          </Link>
          <div className="landing-nav-actions">
            <Link to="/login">Ya tengo una cuenta</Link>
            <Link to="/registro-paciente" className="landing-nav-cta">Contar mi caso <Icon name="arrow-left" size={15} style={{ transform: 'rotate(180deg)' }} /></Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <div className="landing-copy">
            <h1>Encuentra la atención dental que necesitas.</h1>
            <p className="landing-tagline">
              Un espacio para que pacientes reciban atención supervisada y estudiantes sigan desarrollando su experiencia clínica.
            </p>
            <div className="landing-cta">
              <Link to="/registro-paciente" className="btn btn-primary btn-cta">
                Contar mi caso <Icon name="arrow-left" size={17} style={{ transform: 'rotate(180deg)' }} />
              </Link>
              <Link to="/registro-estudiante" className="landing-secondary-cta">
                Soy estudiante de odontología <Icon name="arrow-left" size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
            </div>
          </div>
        </div>

        <div className="landing-hero-scroll" aria-hidden="true"><span /> Desliza para conocer el recorrido</div>
      </header>

      <main>
        <section className="landing-intro" aria-labelledby="intro-title">
          <div className="landing-intro-copy">
            <p className="section-marker">Para pacientes y estudiantes</p>
            <h2 id="intro-title">Ordenamos la información para que la atención sea más fácil.</h2>
            <p>Nos cuentas lo que necesitas, revisamos tu información y buscamos una alternativa de atención que tenga sentido para tu caso.</p>
          </div>
          <figure className="landing-detail-image">
            <img src="/images/dental-matching-detail.png" alt="Manos de un estudiante revisando un caso junto a un espejo dental" loading="lazy" />
            <figcaption>Preparar mejor cada encuentro también es parte de cuidar.</figcaption>
          </figure>
        </section>

        <section className="landing-process" aria-labelledby="process-title">
          <div className="landing-section-heading">
            <p className="section-marker">Así funciona</p>
            <h2 id="process-title">Te acompañamos paso a paso.</h2>
          </div>
          <div className="process-list">
            <article className="process-item">
              <span className="process-number">01</span>
                <div><h3>Cuéntanos qué te pasa</h3><p>Te hacemos algunas preguntas sobre tus molestias y tus datos de contacto para entender mejor tu situación.</p></div>
            </article>
            <article className="process-item">
              <span className="process-number">02</span>
                <div><h3>Vemos qué tipo de atención necesitas</h3><p>Revisamos tus respuestas para entender mejor qué atención puede ayudarte.</p></div>
            </article>
            <article className="process-item">
              <span className="process-number">03</span>
                <div><h3>Buscamos una buena alternativa</h3><p>Consideramos la especialidad, los horarios y la disponibilidad para buscar un estudiante que pueda atenderte con supervisión clínica.</p></div>
            </article>
          </div>
        </section>

        <section className="landing-roles" aria-label="Elige cómo participar">
          <article className="role-panel role-panel-patient">
            <div className="role-panel-top"><Icon name="user-injured" size={24} /><span>Para pacientes</span></div>
            <h2>Cuéntanos qué te pasa.</h2>
            <p>Completa unas preguntas sobre tu situación y te ayudaremos a encontrar el siguiente paso.</p>
            <Link to="/registro-paciente" className="role-panel-link">Contar mi caso <Icon name="arrow-left" size={17} style={{ transform: 'rotate(180deg)' }} /></Link>
          </article>
          <article className="role-panel role-panel-student">
            <div className="role-panel-top"><Icon name="grad-cap" size={24} /><span>Para estudiantes</span></div>
            <h2>Encuentra casos para seguir aprendiendo.</h2>
            <p>Comparte las áreas que puedes atender y tus horarios disponibles para recibir casos acordes a tu formación.</p>
            <Link to="/registro-estudiante" className="role-panel-link">Crear perfil <Icon name="arrow-left" size={17} style={{ transform: 'rotate(180deg)' }} /></Link>
          </article>
        </section>
      </main>

      <footer className="landing-footer landing-footer-v2">
        <div className="landing-footer-brand"><span className="landing-brand-mark"><Icon name="tooth" size={19} /></span> Dental Matching</div>
        <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link></p>
      </footer>
    </div>
  );
}
