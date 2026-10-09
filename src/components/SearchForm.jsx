import { PRIMARY_TYPES, SECONDARY_TYPES } from '../lib/musicbrainz'

export const EMPTY_FILTERS = {
  title: '',
  artist: '',
  album: '',
  tag: '',
  country: '',
  yearFrom: '',
  yearTo: '',
  primaryType: '',
  secondaryTypes: [],
  onlyStudio: false,
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function SearchForm({ kind, filters, onChange, onSubmit, onReset, loading }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })
  const isSong = kind === 'recording'

  const toggleSecondary = (value) => {
    const has = filters.secondaryTypes.includes(value)
    onChange({
      ...filters,
      onlyStudio: false,
      secondaryTypes: has
        ? filters.secondaryTypes.filter((t) => t !== value)
        : [...filters.secondaryTypes, value],
    })
  }

  return (
    <form
      className="search-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid">
        <Field label={isSong ? 'Título de la canción' : 'Título del álbum'}>
          <input
            type="search"
            value={filters.title}
            onChange={set('title')}
            placeholder={isSong ? 'Ej. Paranoid Android' : 'Ej. OK Computer'}
          />
        </Field>
        <Field label="Artista">
          <input type="search" value={filters.artist} onChange={set('artist')} placeholder="Ej. Radiohead" />
        </Field>
        {isSong && (
          <Field label="Álbum">
            <input type="search" value={filters.album} onChange={set('album')} placeholder="Ej. OK Computer" />
          </Field>
        )}
        <Field label="Género / etiqueta">
          <input type="search" value={filters.tag} onChange={set('tag')} placeholder="Ej. rock, jazz, salsa" />
        </Field>
        <Field label="Año desde">
          <input
            type="number"
            min="1900"
            max="2100"
            value={filters.yearFrom}
            onChange={set('yearFrom')}
            placeholder="1990"
          />
        </Field>
        <Field label="Año hasta">
          <input
            type="number"
            min="1900"
            max="2100"
            value={filters.yearTo}
            onChange={set('yearTo')}
            placeholder="2000"
          />
        </Field>
        {isSong && (
          <Field label="País (código ISO)">
            <input
              type="text"
              maxLength={2}
              value={filters.country}
              onChange={(e) => onChange({ ...filters, country: e.target.value.toUpperCase() })}
              placeholder="US, GB, MX…"
            />
          </Field>
        )}
        {!isSong && (
          <Field label="Tipo principal">
            <select value={filters.primaryType} onChange={set('primaryType')}>
              <option value="">Cualquiera</option>
              {PRIMARY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {!isSong && (
        <fieldset className="chips">
          <legend>Tipo secundario</legend>
          <label className={`chip ${filters.onlyStudio ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={filters.onlyStudio}
              onChange={(e) =>
                onChange({ ...filters, onlyStudio: e.target.checked, secondaryTypes: [] })
              }
            />
            Solo de estudio
          </label>
          {SECONDARY_TYPES.map((t) => (
            <label key={t.value} className={`chip ${filters.secondaryTypes.includes(t.value) ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={filters.secondaryTypes.includes(t.value)}
                onChange={() => toggleSecondary(t.value)}
              />
              {t.label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button type="button" className="ghost" onClick={onReset}>
          Limpiar filtros
        </button>
      </div>
    </form>
  )
}
