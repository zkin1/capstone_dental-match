import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { buildRespuestasIniciales } from '../data/triajeFeatures';
import { usePageTitle } from '../hooks/usePageTitle';
import { Select } from '../components/Field';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import Table from '../components/Table';

const CASES = {
  infeccion: {
    label: 'Urgencia infecciosa',
    edad: 32,
    description: 'Dolor intenso, espontáneo, hinchazón y fiebre.',
    answers: {
      tipo_dolor: 'Espontaneo', duracion_dolor: 'Constante', dolor_nocturno: 'Si',
      intensidad_dolor: 9, signos_infeccion: 'Absceso/Hinchazon con fiebre',
      tiempo_evolucion_dolor: 'Menos de 2 dias', dolor_al_morder: 'Si',
    },
  },
  pulpar: {
    label: 'Dolor pulpar',
    edad: 28,
    description: 'Dolor persistente que despierta por la noche y sensibilidad al frío.',
    answers: {
      tipo_dolor: 'Espontaneo', duracion_dolor: 'Persistente', dolor_nocturno: 'Si',
      sensibilidad: 'Solo frio', intensidad_dolor: 7, signos_infeccion: 'Ninguno',
    },
  },
  periodontal: {
    label: 'Caso periodontal',
    edad: 48,
    description: 'Encías retraídas, sangrado y movilidad dental severa.',
    answers: {
      tipo_dolor: 'Sin dolor', intensidad_dolor: 1, estado_periodontal: 'Periodontitis avanzada',
      movilidad_dental: 'Grado III (severa)', sangrado_encias: 'Espontaneo',
      historial_bolsas: 'Si, me lo han dicho',
    },
  },
};

const FIELDS = [
  ['tipo_dolor', 'Tipo de dolor'],
  ['duracion_dolor', 'Duración'],
  ['dolor_nocturno', 'Dolor nocturno'],
  ['intensidad_dolor', 'Intensidad'],
  ['signos_infeccion', 'Signos de infección'],
  ['estado_periodontal', 'Estado periodontal'],
];

const ROLES = [
  ['Paciente', 'Público', 'Registra su caso, responde el triaje y recibe número de caso y posible asignación.'],
  ['Estudiante', 'Autenticado', 'Registra especialidades y horarios, revisa sus casos y actualiza estados y notas.'],
  ['Coordinador', 'Gestión', 'Administra pacientes y estudiantes, ejecuta matching y supervisa asignaciones.'],
  ['Administrador', 'Control', 'Tiene las funciones del coordinador y permisos adicionales para usuarios internos.'],
];

export default function AgentPanel() {
  usePageTitle('Agente IA');
  const [caseKey, setCaseKey] = useState('infeccion');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = CASES[caseKey];
  const input = { ...buildRespuestasIniciales(), ...selected.answers, queja: selected.description };

  async function analyze() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await apiFetch('/matching/agent-preview', {
        method: 'POST',
        body: JSON.stringify({ answers: input, edad: selected.edad }),
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const comparisonRows = result ? FIELDS.map(([key, label]) => ({
    key, label, input: input[key], output: result.preCategorizacion[key],
  })) : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Agente IA</h1>
          <p className="page-subtitle">Prueba la pre-categorización y separa claramente IA, reglas clínicas y matching.</p>
        </div>
      </div>

      <section className="card agent-explainer">
        <div><Icon name="robot" size={24} /><strong>Gemini organiza</strong><span>Normaliza 23 respuestas del triaje.</span></div>
        <div><Icon name="shield" size={24} /><strong>Las reglas deciden</strong><span>Especialidad, prioridad y alertas son deterministas.</span></div>
        <div><Icon name="link" size={24} /><strong>El matching asigna</strong><span>Compara horario, especialidad, carga y urgencia.</span></div>
      </section>

      <div className="agent-workspace">
        <section className="card">
          <h2>Analizar un caso de ejemplo</h2>
          <Select label="Escenario" value={caseKey} onChange={event => { setCaseKey(event.target.value); setResult(null); }}>
            {Object.entries(CASES).map(([key, scenario]) => <option key={key} value={key}>{scenario.label}</option>)}
          </Select>
          <p className="agent-case"><strong>Paciente ficticio, {selected.edad} años:</strong> {selected.description}</p>
          <Button onClick={analyze} loading={loading} icon="sparkles" className="btn-block">
            {loading ? 'Consultando a Gemini…' : 'Analizar con el agente'}
          </Button>
          {error && <div className="alert agent-error" role="alert"><Icon name="warning" size={18} />{error}</div>}
        </section>

        <section className="card agent-result" aria-live="polite">
          <h2>Resultado</h2>
          {!result && <p className="muted">Ejecuta un escenario para ver proveedor, latencia, salida de IA y decisión clínica.</p>}
          {result && (
            <>
              <div className="agent-meta">
                <Badge value="activo">{result.agent.provider}</Badge>
                <span>{result.agent.model}</span>
                <span>{result.responseTime} ms</span>
              </div>
              <dl className="agent-decision">
                <div><dt>Especialidad</dt><dd>{result.categoria.specialty}</dd></div>
                <div><dt>Prioridad</dt><dd><Badge value={result.categoria.priority} /></dd></div>
                <div><dt>Motivo</dt><dd>{result.categoria.reason}</dd></div>
                <div><dt>Alerta clínica</dt><dd>{result.categoria.redFlag ? 'Sí' : 'No'}</dd></div>
              </dl>
            </>
          )}
        </section>
      </div>

      {result && (
        <section className="agent-section">
          <h2>Entrada comparada con la salida del agente</h2>
          <Table caption="Comparación del agente" rows={comparisonRows} keyFn={row => row.key} columns={[
            { key: 'label', label: 'Dato' },
            { key: 'input', label: 'Entrada' },
            { key: 'output', label: 'Salida IA' },
          ]} />
        </section>
      )}

      <section className="agent-section">
        <h2>Qué puede hacer cada usuario</h2>
        <div className="agent-role-grid">
          {ROLES.map(([name, access, description]) => (
            <article className="card" key={name}>
              <Badge value="asignado">{access}</Badge>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
