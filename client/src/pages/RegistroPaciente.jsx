import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { TRIAJE_FEATURES, TRIAJE_SECTIONS, buildRespuestasIniciales } from '../data/triajeFeatures';
import { Input, Select, Textarea } from '../components/Field';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Chip from '../components/Chip';

function RegistroAside() {
  return (
    <aside className="registro-aside">
      <Link to="/landing" className="public-brand" aria-label="Dental Matching, inicio">
        <span className="public-brand-mark"><Icon name="tooth" size={18} /></span>
        <span>Dental Matching</span>
      </Link>
      <div>
        <h2>Cuéntanos qué te pasa.</h2>
        <p>Cuéntanos qué te pasa y te haremos unas preguntas para buscar una atención odontológica supervisada.</p>
        <ul className="registro-benefits">
          <li><Icon name="check-circle" size={16} /> Preguntas simples y fáciles de responder.</li>
          <li><Icon name="check-circle" size={16} /> Podrás hacer seguimiento de tu caso.</li>
          <li><Icon name="check-circle" size={16} /> Buscamos una opción según tu situación y disponibilidad.</li>
        </ul>
        <p className="registro-trust">Esta orientación no reemplaza un diagnóstico profesional.</p>
      </div>
    </aside>
  );
}

function esVisible(feature, respuestas) {
  if (feature.ocultarSiSinDolor && respuestas.tipo_dolor === 'Sin dolor') return false;
  if (feature.ocultarSiSinMedicamento && respuestas.medicamento_dolor === 'Ninguno') return false;
  if (feature.ocultarSiSinFistula && respuestas.signos_infeccion !== 'Fistula') return false;
  return true;
}

export default function RegistroPaciente() {
  usePageTitle('Cuéntanos tu caso');
  const [datos, setDatos] = useState({ nombre_completo: '', edad: '', telefono: '', email: '', ciudad: 'Metropolitana' });
  const [queja, setQueja] = useState('');
  const [respuestas, setRespuestas] = useState(buildRespuestasIniciales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [consentimiento, setConsentimiento] = useState(false);

  function setDato(field, val) { setDatos(d => ({ ...d, [field]: val })); }

  function setRespuesta(key, val) {
    setRespuestas(r => {
      const next = { ...r, [key]: val };
      // Si ya no hay dolor, todo lo relacionado vuelve a N/A
      if (key === 'tipo_dolor' && val === 'Sin dolor') {
        for (const f of TRIAJE_FEATURES) {
          if (f.ocultarSiSinDolor) next[f.key] = f.na;
        }
      }
      if (key === 'medicamento_dolor' && val === 'Ninguno') next.alivio_medicamento = 'N/A';
      if (key === 'signos_infeccion' && val !== 'Fistula') next.tiempo_fistula = 'N/A';
      return next;
    });
  }

  const totalVisibles = TRIAJE_FEATURES.filter(f => esVisible(f, respuestas)).length;
  const respondidas = TRIAJE_FEATURES.filter(f => {
    if (!esVisible(f, respuestas)) return false;
    const v = respuestas[f.key];
    return v !== '' && v !== null && v !== f.na;
  }).length;
  const progreso = totalVisibles > 0 ? Math.round((respondidas / totalVisibles) * 100) : 0;

  async function submit(e) {
    e.preventDefault();
    if (!respuestas.tipo_dolor) {
      setError('Indica cómo es el dolor (o selecciona "Sin dolor") en la sección "Sobre el dolor".');
      return;
    }
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/pacientes/intake', {
        method: 'POST',
        body: JSON.stringify({
          nombre_completo: datos.nombre_completo,
          edad: datos.edad ? parseInt(datos.edad) : null,
          telefono: datos.telefono,
          email: datos.email,
          ciudad: datos.ciudad,
          respuestas: { ...respuestas, queja },
          consentimiento_datos: consentimiento,
        }),
      });
      setResultado(data.data);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (resultado) {
    return (
      <div className="registro-page">
        <div className="registro-shell registro-shell-confirmation">
          <RegistroAside />
          <div className="registro-container">
          <div className="card confirmation-card dm-enter">
            <div className="confirmation-icon"><Icon name="check-circle" size={56} /></div>
            <h2>¡Registro exitoso!</h2>
            <p className="confirmation-case">Tu número de caso: <strong>{resultado.numeroCaso}</strong></p>
            {resultado.alertaClinica && <div className="alert" role="alert"><Icon name="warning" size={18} />{resultado.alertaClinica}</div>}
            {resultado.estudianteAsignado ? (
              <div className="confirmation-assignment">
                <p>Se te ha asignado al estudiante:</p>
                <p className="assignment-name">{resultado.estudianteAsignado.nombre}</p>
                <p className="assignment-code">Código: {resultado.estudianteAsignado.codigo}</p>
                <p className="muted">Cita propuesta: {resultado.estudianteAsignado.fecha} · {resultado.estudianteAsignado.horario}. Te contactarán para confirmarla.</p>
              </div>
            ) : (
              <p className="muted">Tu caso está en revisión. Te contactaremos pronto para asignarte un estudiante.</p>
            )}
            <Link to="/landing" className="btn btn-primary">Volver al inicio</Link>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registro-page">
      <div className="registro-shell">
        <RegistroAside />
        <div className="registro-container">
        <header className="registro-header">
          <Link to="/landing" className="registro-back"><Icon name="arrow-left" size={16} /> Volver</Link>
          <div className="registro-title-icon"><Icon name="user-injured" size={26} /></div>
            <h1>Cuéntanos sobre tu caso</h1>
            <p className="muted">Te haremos algunas preguntas sobre tu situación para buscar una atención acorde a tus necesidades, horarios y ciudad.</p>
        </header>

        <form className="card registration-form" onSubmit={submit}>
          {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

          <h2 className="form-section-title"><Icon name="id-card" size={17} /> Datos personales</h2>
          <div className="form-grid">
            <Input label="Nombre completo" required value={datos.nombre_completo} onChange={e => setDato('nombre_completo', e.target.value)} />
            <Input label="Teléfono" required value={datos.telefono} onChange={e => setDato('telefono', e.target.value)} />
            <Input label="Email" type="email" value={datos.email} onChange={e => setDato('email', e.target.value)} />
            <Input label="Edad" type="number" required min="1" max="120" value={datos.edad} onChange={e => setDato('edad', e.target.value)} />
            <Select label="Ciudad" required value={datos.ciudad} onChange={e => setDato('ciudad', e.target.value)}>
              <option value="Metropolitana">Metropolitana</option>
              <option value="Valparaíso">Valparaíso</option>
              <option value="Concepción">Concepción</option>
            </Select>
          </div>

          <h2 className="form-section-title"><Icon name="chat" size={17} /> Cuéntanos qué te pasa *</h2>
          <Textarea
            label="Cuéntanos con tus palabras"
            className="full-width"
            rows={3}
            required
            placeholder="Ej: Me duele una muela desde hace una semana, sobre todo con cosas frías…"
            value={queja}
            onChange={e => setQueja(e.target.value)}
          />

          <div className="triaje-progress">
            <div className="triaje-progress-bar" style={{ width: `${progreso}%` }} />
          </div>
          <p className="muted triaje-progress-text" role="status">Has respondido {respondidas} de {totalVisibles} preguntas</p>

          {TRIAJE_SECTIONS.map(sec => (
            <div key={sec.id}>
              <h2 className="form-section-title"><Icon name={sec.icono} size={17} /> {sec.titulo}</h2>
              {TRIAJE_FEATURES.filter(f => f.seccion === sec.id && esVisible(f, respuestas)).map(f => (
                <FeatureField key={f.key} feature={f} value={respuestas[f.key]} onChange={setRespuesta} />
              ))}
            </div>
          ))}

          <label className="consent-row">
            <input type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} required />
            <span>Acepto que usemos mis datos para gestionar mi caso y contactarme. Entiendo que esta orientación no reemplaza un diagnóstico odontológico.</span>
          </label>

          <Button type="submit" loading={loading} icon="send" className="btn-block">
            {loading ? 'Estamos revisando tu información…' : 'Enviar mi caso'}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}

function FeatureField({ feature, value, onChange }) {
  const etiqueta = (opt) => feature.labels?.[opt] || opt;

  if (feature.ui === 'slider') {
    return (
      <div className="field full-width">
        <label htmlFor={`slider-${feature.key}`}>{feature.label}: <strong>{value}/10</strong></label>
        <input
          id={`slider-${feature.key}`}
          type="range" min="1" max="10" value={value}
          onChange={e => onChange(feature.key, parseInt(e.target.value))}
          className="dolor-slider"
          aria-valuetext={`${value} de 10`}
        />
      </div>
    );
  }

  if (feature.ui === 'select') {
    return (
      <Select label={feature.label} className="full-width" value={value} onChange={e => onChange(feature.key, e.target.value)}>
        {feature.options.map(opt => <option key={opt} value={opt}>{etiqueta(opt)}</option>)}
      </Select>
    );
  }

  // radio chips (accesibles: input radio real oculto con visually-hidden)
  return (
    <fieldset className="field full-width">
      <legend className="field-legend">{feature.label}</legend>
      <div className="chip-grid">
        {feature.options.map(opt => (
          <Chip
            key={opt}
            type="radio"
            name={feature.key}
            checked={value === opt}
            onChange={() => onChange(feature.key, opt)}
          >
            {etiqueta(opt)}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
