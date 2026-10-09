// Cliente mínimo de la API de búsqueda de MusicBrainz (https://musicbrainz.org/doc/MusicBrainz_API)
// La API permite CORS y limita a ~1 petición por segundo, así que serializamos las llamadas.

const BASE_URL = 'https://musicbrainz.org/ws/2'
const MIN_INTERVAL_MS = 1100

export const PAGE_SIZE = 20

export const PRIMARY_TYPES = [
  { value: 'album', label: 'Álbum' },
  { value: 'single', label: 'Sencillo' },
  { value: 'ep', label: 'EP' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'other', label: 'Otro' },
]

export const SECONDARY_TYPES = [
  { value: 'live', label: 'En vivo' },
  { value: 'compilation', label: 'Recopilatorio' },
  { value: 'soundtrack', label: 'Banda sonora' },
  { value: 'remix', label: 'Remix' },
  { value: 'demo', label: 'Demo' },
  { value: 'mixtape/street', label: 'Mixtape' },
]

let lastRequestAt = 0
let queue = Promise.resolve()

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

// Encola la petición respetando el intervalo mínimo entre llamadas.
function throttled(task, signal) {
  const run = async () => {
    const delay = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now())
    if (delay) await wait(delay, signal)
    lastRequestAt = Date.now()
    return task()
  }
  const result = queue.then(run, run)
  queue = result.catch(() => {})
  return result
}

// Escapa los caracteres especiales de Lucene y envuelve el valor en comillas.
function phrase(value) {
  return `"${value.trim().replace(/(["\\])/g, '\\$1')}"`
}

function clause(field, value) {
  return value && value.trim() ? `${field}:${phrase(value)}` : null
}

function yearRange(from, to) {
  const start = from ? String(from).trim() : ''
  const end = to ? String(to).trim() : ''
  if (!start && !end) return null
  const lo = start || '0000'
  const hi = end ? `${end}-12-31` : '9999-12-31'
  return `firstreleasedate:[${lo} TO ${hi}]`
}

export function buildQuery(kind, f) {
  const parts = []

  if (kind === 'recording') {
    parts.push(clause('recording', f.title))
    parts.push(clause('artist', f.artist))
    parts.push(clause('release', f.album))
    parts.push(clause('tag', f.tag))
    parts.push(clause('country', f.country))
  } else {
    parts.push(clause('releasegroup', f.title))
    parts.push(clause('artist', f.artist))
    parts.push(clause('tag', f.tag))
    if (f.primaryType) parts.push(`primarytype:${f.primaryType}`)
    for (const t of f.secondaryTypes ?? []) parts.push(`secondarytype:${phrase(t)}`)
    if (f.onlyStudio) parts.push('-secondarytype:*')
  }

  parts.push(yearRange(f.yearFrom, f.yearTo))
  return parts.filter(Boolean).join(' AND ')
}

function artistName(credit = []) {
  return credit.map((c) => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('')
}

function normalizeRecording(r) {
  const releases = r.releases ?? []
  return {
    id: r.id,
    kind: 'recording',
    title: r.title,
    artist: artistName(r['artist-credit']),
    artistId: r['artist-credit']?.[0]?.artist?.id,
    lengthMs: r.length ?? null,
    firstReleaseDate: r['first-release-date'] ?? '',
    releases: releases.slice(0, 3).map((rel) => ({
      id: rel.id,
      title: rel.title,
      groupId: rel['release-group']?.id,
    })),
    tags: (r.tags ?? []).sort((a, b) => b.count - a.count).slice(0, 4).map((t) => t.name),
    score: r.score,
    url: `https://musicbrainz.org/recording/${r.id}`,
  }
}

function normalizeReleaseGroup(g) {
  return {
    id: g.id,
    kind: 'release-group',
    title: g.title,
    artist: artistName(g['artist-credit']),
    artistId: g['artist-credit']?.[0]?.artist?.id,
    primaryType: g['primary-type'] ?? '',
    secondaryTypes: g['secondary-types'] ?? [],
    firstReleaseDate: g['first-release-date'] ?? '',
    tags: (g.tags ?? []).sort((a, b) => b.count - a.count).slice(0, 4).map((t) => t.name),
    score: g.score,
    cover: `https://coverartarchive.org/release-group/${g.id}/front-250`,
    url: `https://musicbrainz.org/release-group/${g.id}`,
  }
}

async function request(url, signal, attempt = 0) {
  const res = await throttled(() => fetch(url, { signal, headers: { Accept: 'application/json' } }), signal)
  if ((res.status === 503 || res.status === 429) && attempt < 2) {
    await wait(2000, signal)
    return request(url, signal, attempt + 1)
  }
  if (!res.ok) {
    throw new Error(`MusicBrainz respondió con el error ${res.status}`)
  }
  return res.json()
}

/**
 * Busca canciones (kind = 'recording') o álbumes (kind = 'release-group').
 * Devuelve { items, count }.
 */
export async function search(kind, filters, { page = 0, signal } = {}) {
  const query = buildQuery(kind, filters)
  if (!query) throw new Error('Escribe al menos un criterio de búsqueda.')

  const params = new URLSearchParams({
    query,
    fmt: 'json',
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
  })
  const data = await request(`${BASE_URL}/${kind}?${params}`, signal)

  if (kind === 'recording') {
    return { items: (data.recordings ?? []).map(normalizeRecording), count: data.count ?? 0 }
  }
  return { items: (data['release-groups'] ?? []).map(normalizeReleaseGroup), count: data.count ?? 0 }
}

export function formatDuration(ms) {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
