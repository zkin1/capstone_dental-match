import { useState } from 'react';
import { dentalTariffs, tariffSources } from '../data/dentalTariffs';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

function TariffBar({ label, value, maximum, highlight = false }) {
  return (
    <div className="dm-tariff-bar">
      <dt>{label}</dt>
      <dd>{pesos.format(value)}</dd>
      <div className="dm-tariff-track" aria-hidden="true">
        <span className={highlight ? 'dm-tariff-fill university' : 'dm-tariff-fill'} style={{ width: `${value / maximum * 100}%` }} />
      </div>
    </div>
  );
}

export default function DentalPriceCompare() {
  const [selectedId, setSelectedId] = useState(dentalTariffs[0].id);
  const selected = dentalTariffs.find(tariff => tariff.id === selectedId);
  const university = selected.university + (selected.laboratory ?? 0);
  const maximum = Math.max(university, selected.private);
  const difference = Math.round((selected.private - university) / selected.private * 100);

  return (
    <section id="precios" className="dm-landing-wrap dm-landing-prices" aria-labelledby="precios-heading">
      <h2 id="precios-heading">Compara aranceles dentales.</h2>
      <p className="dm-landing-muted dm-tariff-instructions">Elige una prestación para ver sus valores de referencia en pesos chilenos.</p>
      <div className="dm-tariff-grid">
        <label className="dm-tariff-select">
          <span>Tratamiento</span>
          <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
            {dentalTariffs.map(tariff => <option key={tariff.id} value={tariff.id}>{tariff.label}</option>)}
          </select>
        </label>
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
        <div className="dm-tariff-summary" aria-live="polite" aria-atomic="true">
          <p className="dm-tariff-detail">{selected.detail}</p>
          <div className="dm-tariff-savings">
            <p className="dm-tariff-percent">{Math.abs(difference)}<span>%</span></p>
            <p className="dm-landing-muted">{difference >= 0 ? 'menos' : 'más'} en el arancel de pregrado para este ejemplo</p>
          </div>
          <dl className="dm-tariff-bars">
            <TariffBar label="RedSalud · Colmena" value={selected.private} maximum={maximum} />
            <TariffBar label="Universidad de Chile · Pregrado" value={university} maximum={maximum} highlight />
          </dl>
          <p className="dm-tariff-note">{selected.laboratory
            ? `El monto universitario incluye ${pesos.format(selected.university)} de atención y ${pesos.format(selected.laboratory)} de laboratorio.`
            : selected.note}</p>
        </div>
      </div>
      <p className="dm-tariff-note dm-tariff-disclaimer">Aranceles publicados de 2026. El de RedSalud corresponde a la referencia Dental Plus Colmena antes de descuentos. Confirma qué incluye cada valor y el monto final con la clínica.</p>
      <p className="dm-landing-mobile-only dm-tariff-note">Valores de referencia en pesos chilenos. La clínica confirma el precio final.</p>
      <details className="dm-landing-disclosure dm-tariff-sources">
        <summary>Ver fuentes y códigos</summary>
        <p className="dm-landing-mobile-only dm-tariff-note">Aranceles de 2026. RedSalud corresponde al arancel Dental Plus Colmena antes de descuentos.</p>
        <ul>
          <li><a href={tariffSources.university} target="_blank" rel="noreferrer">Universidad de Chile · Pregrado 2026</a> ({selected.universityCode})</li>
          <li><a href={tariffSources.private} target="_blank" rel="noreferrer">Colmena · Dental Plus RedSalud 2026</a> ({selected.privateCode})</li>
          {selected.laboratoryCode && <li><a href={tariffSources.laboratory} target="_blank" rel="noreferrer">Universidad de Chile · Laboratorio 2026</a> ({selected.laboratoryCode})</li>}
        </ul>
      </details>
    </section>
  );
}
