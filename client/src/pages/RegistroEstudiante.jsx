import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { Input, Select } from '../components/Field';
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

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const ESPECIALIDADES = [
  'Endodoncia', 'Operatoria Dental', 'Ortodoncia', 'Periodoncia',
  'Cirugía Oral', 'Odontopediatría', 'Prótesis Fija', 'Prótesis Removible',
];

export default function RegistroEstudiante() {
  usePageTitle('Crear perfil clínico');
  const [form, setForm] = useState({
    nombre_completo: '', año_carrera: '4to', telefono: '', email: '', universidad: '',
    password: '', confirmPassword: '',
    ciudad: 'Metropolitana', casos_necesarios: 10,
    especialidades: [], horarios: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function toggleEspecialidad(esp) {
    setForm(f => ({
      ...f,
      especialidades: f.especialidades.includes(esp)
        ? f.especialidades.filter(v => v !== esp)
        : [...f.especialidades, esp],
    }));
  }

  function toggleDia(dia) {
    setForm(f => {
      const horarios = { ...f.horarios };
      if (horarios[dia]) delete horarios[dia];
      else horarios[dia] = { hora_inicio: '08:00', hora_fin: '12:00' };
      return { ...f, horarios };
    });
  }

  function setHora(dia, campo, valor) {
    setForm(f => ({ ...f, horarios: { ...f.horarios, [dia]: { ...f.horarios[dia], [campo]: valor } } }));
  }

  const diasSeleccionados = Object.keys(form.horarios);

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (form.especialidades.length === 0) {
      setError('Selecciona al menos una especialidad.');
      return;
    }
    if (diasSeleccionados.length === 0) {
      setError('Selecciona al menos un día de disponibilidad.');
      return;
    }
    for (const dia of diasSeleccionados) {
      const { hora_inicio, hora_fin } = form.horarios[dia];
      if (hora_inicio >= hora_fin) {
        setError(`El ${dia}: la hora de inicio debe ser antes de la hora de término.`);
        return;
      }
    }

    setLoading(true);
    try {
      const horarios_disponibles = diasSeleccionados.map(dia => ({
        dia,
        hora_inicio: form.horarios[dia].hora_inicio,
        hora_fin: form.horarios[dia].hora_fin,
      }));
      const data = await apiFetch('/estudiantes/register', {
        method: 'POST',
        body: JSON.stringify({
          nombre_completo: form.nombre_completo,
          año_carrera: form.año_carrera,
          telefono: form.telefono,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          universidad: form.universidad,
          ciudad: form.ciudad,
          casos_necesarios: form.casos_necesarios,
          especialidades: form.especialidades,
          dias_disponibles: diasSeleccionados,
          horarios_disponibles,
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
            <h2>¡Listo! Tu perfil está creado.</h2>
            <p>Este es tu código de estudiante:</p>
            <p className="confirmation-code">{resultado.codigo_estudiante}</p>
            <p className="muted">Ya puedes iniciar sesión con el email y la contraseña que registraste.</p>
            <Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
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
          <div className="registro-title-icon"><Icon name="grad-cap" size={26} /></div>
          <h1>Crea tu perfil clínico</h1>
          <p className="muted">Indica las áreas que puedes atender y tus horarios disponibles para recibir casos acordes a tu formación.</p>
        </header>

        <form className="card registration-form" onSubmit={submit}>
          {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

          <h2 className="form-section-title"><Icon name="id-card" size={17} /> Datos personales</h2>
          <div className="form-grid">
            <Input label="Nombre completo" required value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} />
            <Input label="Email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Contraseña" type="password" required minLength={8} autoComplete="new-password"
              hint="8 caracteres, con mayúscula, minúscula, número y símbolo."
              value={form.password} onChange={e => set('password', e.target.value)} />
            <Input label="Confirmar contraseña" type="password" required minLength={8} autoComplete="new-password"
              value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            <Select label="Año de carrera" required value={form.año_carrera} onChange={e => set('año_carrera', e.target.value)}>
              <option value="4to">4to</option>
              <option value="5to">5to</option>
            </Select>
            <Input label="Universidad" placeholder="Nombre de tu universidad" value={form.universidad} onChange={e => set('universidad', e.target.value)} />
            <Select label="Ciudad" required value={form.ciudad} onChange={e => set('ciudad', e.target.value)}>
              <option value="Metropolitana">Metropolitana</option>
              <option value="Valparaíso">Valparaíso</option>
              <option value="Concepción">Concepción</option>
            </Select>
            <Input label="Cantidad máxima de casos" type="number" min="1" max="50" value={form.casos_necesarios} onChange={e => set('casos_necesarios', parseInt(e.target.value) || 10)} />
          </div>

          <h2 className="form-section-title"><Icon name="stethoscope" size={17} /> ¿Qué áreas puedes atender? *</h2>
          <div className="chip-grid" role="group" aria-label="Especialidades">
            {ESPECIALIDADES.map(esp => (
              <Chip key={esp} checked={form.especialidades.includes(esp)} onChange={() => toggleEspecialidad(esp)}>
                {esp}
              </Chip>
            ))}
          </div>

          <h2 className="form-section-title"><Icon name="clock" size={17} /> ¿Cuándo puedes atender? *</h2>
          <p className="muted">Indica los días y horarios en que puedes atender en clínica.</p>
          <div className="chip-grid" role="group" aria-label="Días disponibles">
            {DIAS.map(d => (
              <Chip key={d} checked={!!form.horarios[d]} onChange={() => toggleDia(d)}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Chip>
            ))}
          </div>

          {diasSeleccionados.length > 0 && (
            <div className="horario-grid">
              {DIAS.filter(d => form.horarios[d]).map(dia => (
                <div key={dia} className="horario-row">
                  <span className="horario-dia">{dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                  <input type="time" step="900" value={form.horarios[dia].hora_inicio}
                    onChange={e => setHora(dia, 'hora_inicio', e.target.value)} required aria-label={`Hora inicio ${dia}`} />
                  <span className="horario-sep">a</span>
                  <input type="time" step="900" value={form.horarios[dia].hora_fin}
                    onChange={e => setHora(dia, 'hora_fin', e.target.value)} required aria-label={`Hora fin ${dia}`} />
                </div>
              ))}
            </div>
          )}

          <Button type="submit" loading={loading} icon="user-plus" className="btn-block">
            {loading ? 'Creando tu perfil…' : 'Crear mi perfil'}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}
