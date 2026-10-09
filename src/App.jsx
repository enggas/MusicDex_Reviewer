import { useCallback, useEffect, useRef, useState } from 'react'
import SearchForm, { EMPTY_FILTERS } from './components/SearchForm'
import ResultCard from './components/ResultCard'
import { PAGE_SIZE, search } from './lib/musicbrainz'
import './App.css'

const KINDS = [
  { value: 'recording', label: 'Canciones' },
  { value: 'release-group', label: 'Álbumes' },
]

function App() {
  const [kind, setKind] = useState('release-group')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [state, setState] = useState({ status: 'idle', items: [], count: 0, page: 0, error: '' })
  const controller = useRef(null)

  const run = useCallback(async (k, f, page) => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl
    setState((s) => ({ ...s, status: 'loading', error: '', page }))
    try {
      const { items, count } = await search(k, f, { page, signal: ctrl.signal })
      setState({ status: 'done', items, count, page, error: '' })
    } catch (err) {
      if (err.name === 'AbortError') return
      setState((s) => ({ ...s, status: 'error', items: [], count: 0, error: err.message }))
    }
  }, [])

  useEffect(() => () => controller.current?.abort(), [])

  const changeKind = (next) => {
    if (next === kind) return
    controller.current?.abort()
    setKind(next)
    setState({ status: 'idle', items: [], count: 0, page: 0, error: '' })
  }

  const reset = () => {
    controller.current?.abort()
    setFilters(EMPTY_FILTERS)
    setState({ status: 'idle', items: [], count: 0, page: 0, error: '' })
  }

  const totalPages = Math.ceil(state.count / PAGE_SIZE)
  const goTo = (p) => {
    run(kind, filters, p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app">
      <header>
        <h1>MusicDex</h1>
        <p className="subtitle">Busca canciones y álbumes en la base de datos de MusicBrainz</p>
      </header>

      <div className="tabs" role="tablist">
        {KINDS.map((k) => (
          <button
            key={k.value}
            role="tab"
            aria-selected={kind === k.value}
            className={kind === k.value ? 'tab active' : 'tab'}
            onClick={() => changeKind(k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <SearchForm
        kind={kind}
        filters={filters}
        onChange={setFilters}
        onSubmit={() => run(kind, filters, 0)}
        onReset={reset}
        loading={state.status === 'loading'}
      />

      <section aria-live="polite" className="results">
        {state.status === 'error' && <p className="notice error">{state.error}</p>}
        {state.status === 'loading' && <p className="notice">Consultando MusicBrainz…</p>}
        {state.status === 'done' && state.items.length === 0 && (
          <p className="notice">No se encontraron resultados. Prueba con menos filtros.</p>
        )}
        {state.status === 'done' && state.items.length > 0 && (
          <>
            <p className="count">
              {state.count.toLocaleString('es')} resultados · página {state.page + 1} de{' '}
              {Math.max(totalPages, 1).toLocaleString('es')}
            </p>
            <ul className="list">
              {state.items.map((item) => (
                <ResultCard key={item.id} item={item} />
              ))}
            </ul>
            <nav className="pager">
              <button className="ghost" disabled={state.page === 0} onClick={() => goTo(state.page - 1)}>
                ← Anterior
              </button>
              <button
                className="ghost"
                disabled={state.page + 1 >= totalPages}
                onClick={() => goTo(state.page + 1)}
              >
                Siguiente →
              </button>
            </nav>
          </>
        )}
      </section>

      <footer>
        Datos de <a href="https://musicbrainz.org" target="_blank" rel="noreferrer">MusicBrainz</a> · portadas de{' '}
        <a href="https://coverartarchive.org" target="_blank" rel="noreferrer">Cover Art Archive</a>
      </footer>
    </main>
  )
}

export default App
