import { useState } from 'react';
import { dentalTariffs, tariffSources } from '../data/dentalTariffs';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

function TariffBar({ label, value, maximum, highlight = false }) {
  return (
    <div className={highlight ? 'dm-tariff-bar dm-tariff-bar-university' : 'dm-tariff-bar'}>
      <dt>{label}</dt>
      <dd>{pesos.format(value)}</dd>
      {maximum > 0 && <div className="dm-tariff-track" aria-hidden="true">
        <span className={highlight ? 'dm-tariff-fill university' : 'dm-tariff-fill'} style={{ width: `${value / maximum * 100}%` }} />
      </div>}
    </div>
  );
}

function TariffSummary({ tariff, showSavings = false }) {
  const university = tariff.university + (tariff.laboratory ?? 0);
  const maximum = showSavings ? Math.max(university, tariff.private) : 0;
  const difference = Math.round((tariff.private - university) / tariff.private * 100);

  return (
    <>
      <p className="dm-tariff-detail">{tariff.detail}</p>
      {showSavings && (
        <>
          <p className="dm-tariff-percent">{Math.abs(difference)}<span>%</span></p>
          <p className="dm-landing-muted">{difference >= 0 ? 'menos' : 'más'} en el arancel de pregrado para este ejemplo</p>
        </>
      )}
      <dl className="dm-tariff-bars">
        <TariffBar label="RedSalud · Colmena" value={tariff.private} maximum={maximum} />
        <TariffBar label="Universidad de Chile · Pregrado" value={university} maximum={maximum} highlight />
      </dl>
      <p className="dm-tariff-note">
        {tariff.laboratory ? (
          <>El monto universitario incluye {pesos.format(tariff.university)} de atención y {pesos.format(tariff.laboratory)} de laboratorio.</>
        ) : tariff.note}
      </p>
    </>
  );
}

export default function DentalPriceCompare() {
  const [selectedId, setSelectedId] = useState(dentalTariffs[0].id);
  const [mobileOpen, setMobileOpen] = useState(true);
  const selected = dentalTariffs.find(tariff => tariff.id === selectedId);

  return (
    <section id="precios" className="dm-landing-wrap dm-landing-prices" aria-labelledby="precios-heading">
      <h2 id="precios-heading">Compara aranceles dentales.</h2>
      <p className="dm-landing-muted dm-tariff-instructions">Elige una prestación para ver sus valores de referencia en pesos chilenos.</p>
      <div className="dm-tariff-grid">
        <fieldset className="dm-tariff-choices">
          <legend className="visually-hidden">Prestación dental</legend>
          {dentalTariffs.map(tariff => (
            <label className="dm-tariff-option" key={tariff.id}>
              <input
                className="visually-hidden"
                type="radio"
                name="landing-tariff"
                value={tariff.id}
                checked={tariff.id === selectedId}
                onChange={() => setSelectedId(tariff.id)}
              />
              <span>{tariff.label}</span>
            </label>
          ))}
        </fieldset>
        <div aria-live="polite" aria-atomic="true">
          <TariffSummary tariff={selected} showSavings />
        </div>
      </div>
      <div className="dm-tariff-accordion">
        {dentalTariffs.map(tariff => {
          const isOpen = mobileOpen && tariff.id === selectedId;
          const panelId = 'tariff-panel-' + tariff.id;
          return (
            <div className="dm-tariff-item" key={tariff.id}>
              <h3>
                <button
                  className="dm-tariff-trigger"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => {
                    setSelectedId(tariff.id);
                    setMobileOpen(!isOpen);
                  }}
                >
                  {tariff.label}
                  <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
              </h3>
              <div className="dm-tariff-panel" id={panelId} hidden={!isOpen}>
                {isOpen && <TariffSummary tariff={tariff} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="dm-tariff-note dm-tariff-disclaimer">Aranceles publicados de 2026. El de RedSalud corresponde a la referencia Dental Plus Colmena antes de descuentos. Confirma qué incluye cada valor y el monto final con la clínica.</p>
      <p className="dm-landing-mobile-only dm-tariff-note">Valores de referencia en pesos chilenos. La clínica confirma el precio final.</p>
      <div className="dm-tariff-free">
        <strong>En algunos casos, la atención puede ser gratis</strong>
        <p>Algunas universidades ofrecen ciertos tratamientos sin costo durante campañas o convocatorias. Consulta con la clínica por las fechas, los cupos y los requisitos.</p>
      </div>
      <details className="dm-landing-disclosure dm-tariff-sources">
        <summary>Ver fuentes y códigos</summary>
        <p className="dm-landing-mobile-only dm-tariff-note">Aranceles de 2026. RedSalud corresponde al arancel Dental Plus Colmena antes de descuentos.</p>
        <ul>
          <li><a href={tariffSources.university} target="_blank" rel="noreferrer">Universidad de Chile · Pregrado 2026</a> ({selected.universityCode})</li>
          <li><a href={tariffSources.private} target="_blank" rel="noreferrer">Colmena · Dental Plus RedSalud 2026</a> ({selected.privateCode})</li>
          <li><a href="https://odontologia.ufro.cl/clinica-dental-movil-ufro-beneficio-a-180-pacientes-de-seis-comunas-de-la-araucania-durante-el-primer-semestre/" target="_blank" rel="noreferrer">Ejemplo de un operativo sin costo · Universidad de La Frontera</a></li>
          {selected.laboratoryCode && <li><a href={tariffSources.laboratory} target="_blank" rel="noreferrer">Universidad de Chile · Laboratorio 2026</a> ({selected.laboratoryCode})</li>}
        </ul>
      </details>
    </section>
  );
}
