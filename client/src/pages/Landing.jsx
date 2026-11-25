import { useState } from 'react';
import { Link } from 'react-router-dom';
import DentalPriceCompare from '../components/DentalPriceCompare';
import Icon from '../components/Icon';
import { usePageTitle } from '../hooks/usePageTitle';
import './Landing.css';

const motivos = [
  'Me duele una muela',
  'Necesito una limpieza',
  'Tengo una tapadura rota',
  'Me sangran las encías',
  'Quiero una revisión',
  'Me falta una pieza',
];

const preguntas = [
  ['¿Quién me atiende?', 'La atención la realizan estudiantes de odontología en formación clínica, bajo la supervisión de docentes.'],
  ['¿El agente me dice qué tratamiento necesito?', 'Si está disponible, el agente revisa tus respuestas para orientar tu caso. Esa primera clasificación no es un diagnóstico. El equipo odontológico te evalúa y conversa contigo sobre el tratamiento que necesitas.'],
  ['¿Por qué cambian los precios?', 'Cada clínica tiene sus propios aranceles. El costo final depende de lo que se acuerde después de tu evaluación.'],
  ['¿Qué pasa después de contar mi caso?', 'El sistema busca un estudiante según la categoría del caso, los horarios y la disponibilidad. Si hace falta revisar algo o no hay un cupo disponible, tu solicitud queda pendiente.'],
];

export default function Landing() {
  usePageTitle('Bienvenido');
  const [seleccion, setSeleccion] = useState([]);
  const registroState = { quejaInicial: seleccion.join('. ') };

  function toggleMotivo(motivo) {
    setSeleccion(actual => actual.includes(motivo)
      ? actual.filter(item => item !== motivo)
      : [...actual, motivo]);
  }

  return (
    <div className="dm-landing">
      <a className="skip-link" href="#landing-heading">Ir al contenido</a>
      <main>
        <div className="dm-landing-cover">
          <img
            className="dm-landing-cover-image"
            src="/images/dental-matching-hero.png"
            width="1536"
            height="1024"
            alt=""
            fetchPriority="high"
          />
          <header className="dm-landing-wrap dm-landing-nav">
            <Link to="/landing" className="dm-landing-brand">
              <span className="dm-landing-mark"><Icon name="tooth" size={17} /></span>
              Dental Match
            </Link>
            <nav aria-label="Navegación pública">
              <a href="#precios">Precios</a>
              <a href="#como">Cómo funciona</a>
              <Link to="/login">Ya tengo cuenta</Link>
            </nav>
          </header>

          <section className="dm-landing-wrap dm-landing-hero" aria-labelledby="landing-heading">
            <p className="dm-landing-kicker">Atención dental supervisada en clínicas universitarias</p>
            <h1 id="landing-heading" tabIndex={-1}>Hola. <span>¿Qué te</span> está pasando?</h1>
            <p className="dm-landing-mobile-only dm-landing-mobile-intro">Buscamos una opción de atención con estudiantes de odontología bajo supervisión clínica.</p>
            <fieldset className="dm-landing-motives">
              <legend className="visually-hidden">¿Qué te está pasando?</legend>
              {motivos.map(motivo => (
                <button
                  type="button"
                  key={motivo}
                  aria-pressed={seleccion.includes(motivo)}
                  onClick={() => toggleMotivo(motivo)}
                >
                  {motivo}
                </button>
              ))}
            </fieldset>
            <div className="dm-landing-start">
              <Link to="/registro-paciente" state={registroState} className="dm-landing-button">Contar mi caso <span aria-hidden="true">→</span></Link>
              <p>Si quieres, elige uno o más motivos antes de continuar.</p>
            </div>
          </section>
        </div>

        <section className="dm-landing-intro" aria-labelledby="landing-intro-heading">
          <div className="dm-landing-wrap dm-landing-intro-grid">
            <h2 id="landing-intro-heading">Te conectamos con estudiantes de odontología que necesitan pacientes para su formación.</h2>
            <p>Cuéntanos qué te pasa y buscaremos una alternativa de atención para tu caso. Los estudiantes atienden con supervisión clínica.</p>
          </div>
        </section>

        <DentalPriceCompare />

        <section id="como" className="dm-landing-steps" aria-labelledby="landing-steps-heading">
          <h2 className="visually-hidden dm-landing-steps-heading" id="landing-steps-heading">Cómo funciona</h2>
          <ol className="dm-landing-wrap">
            <li>
              <span aria-hidden="true">01</span>
              <h3>Cuéntanos qué te pasa</h3>
              <p>Responde unas preguntas sobre tus molestias y déjanos tus datos de contacto.</p>
            </li>
            <li>
              <span aria-hidden="true">02</span>
              <h3>Orientamos tu caso</h3>
              <p>Si está disponible, un agente de IA revisa tus respuestas y sugiere una precategorización para orientar tu caso.</p>
            </li>
            <li>
              <span aria-hidden="true">03</span>
              <h3>Buscamos quién puede atenderte</h3>
              <p>El sistema puede asignarte a un estudiante según la especialidad, los horarios y la disponibilidad. Algunos casos requieren revisión del equipo.</p>
            </li>
          </ol>
          <p className="dm-landing-wrap dm-landing-reassurance"><strong>Tu tratamiento se define en la consulta.</strong> La categoría inicial es una orientación para organizar tu caso. El equipo odontológico te evalúa y te explica tus opciones.</p>
        </section>

        <section className="dm-landing-wrap dm-landing-faq" aria-labelledby="landing-faq-heading">
          <h2 id="landing-faq-heading">Preguntas que te puedes estar haciendo</h2>
          <div>
            {preguntas.map(([pregunta, respuesta], index) => (
              <details className="dm-landing-disclosure" key={pregunta} open={index === 0}>
                <summary>{pregunta}</summary>
                <p>{respuesta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="dm-landing-close">
          <div className="dm-landing-wrap">
            <h2>Cuéntanos qué te pasa.<br /> Nosotros buscamos el siguiente paso.</h2>
            <Link to="/registro-paciente" state={registroState} className="dm-landing-button">Contar mi caso <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>

      <footer className="dm-landing-footer">
        <div className="dm-landing-wrap">
          <strong>Dental Match</strong>
          <nav aria-label="Enlaces al pie de la página">
            <Link to="/registro-estudiante">Soy estudiante</Link>
            <Link to="/terminos-y-condiciones">Términos y condiciones</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
