import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import './Landing.css';

export default function Terms() {
  usePageTitle('Términos y condiciones');
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="dm-landing">
      <main className="dm-landing-wrap dm-landing-terms">
        <Link to="/landing">← Volver al inicio</Link>
        <h1>Términos y condiciones</h1>
        <p>Dental Match facilita la coordinación de atención odontológica supervisada con estudiantes.</p>

        <section>
          <h2>Tu solicitud de atención</h2>
          <p>Al enviar el formulario se registra tu caso. La asignación depende de la especialidad, la disponibilidad y, cuando corresponda, de la revisión del equipo. La cita queda sujeta a confirmación.</p>
        </section>
        <section>
          <h2>Orientación inicial y evaluación</h2>
          <p>Cuando está disponible, un agente de IA puede revisar las respuestas del cuestionario para sugerir una categoría preliminar. Esta orientación no es un diagnóstico. El equipo odontológico determina el plan de atención después de evaluarte.</p>
        </section>
        <section>
          <h2>Aranceles de referencia</h2>
          <p>El comparador muestra valores publicados por los prestadores o su convenio. El monto y lo que incluye se confirman con la clínica antes de la atención.</p>
        </section>
        <section>
          <h2>Uso de tus respuestas</h2>
          <p>Usamos los datos del formulario para gestionar tu caso y contactarte. El agente puede procesar las respuestas de tu cuestionario, incluido lo que escribas sobre tus molestias. Los campos de nombre y contacto se usan para coordinar tu solicitud.</p>
        </section>
      </main>
    </div>
  );
}
