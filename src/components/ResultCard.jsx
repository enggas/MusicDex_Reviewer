import { useState } from 'react'
import { formatDuration } from '../lib/musicbrainz'

function Cover({ src, title }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="cover placeholder" aria-hidden="true">
        ♪
      </div>
    )
  }
  return <img className="cover" src={src} alt={`Portada de ${title}`} loading="lazy" onError={() => setFailed(true)} />
}

export default function ResultCard({ item }) {
  const isSong = item.kind === 'recording'
  const year = item.firstReleaseDate?.slice(0, 4)

  return (
    <li className="card">
      {isSong ? <Cover /> : <Cover src={item.cover} title={item.title} />}
      <div className="card-body">
        <h3>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </h3>
        <p className="artist">{item.artist || 'Artista desconocido'}</p>
        <p className="meta">
          {isSong ? (
            <>
              {formatDuration(item.lengthMs) && <span>{formatDuration(item.lengthMs)}</span>}
              {year && <span>{year}</span>}
              {item.releases[0] && <span>en «{item.releases[0].title}»</span>}
            </>
          ) : (
            <>
              {item.primaryType && <span>{item.primaryType}</span>}
              {item.secondaryTypes.map((t) => (
                <span key={t}>{t}</span>
              ))}
              {year && <span>{year}</span>}
            </>
          )}
        </p>
        {item.tags.length > 0 && (
          <ul className="tags">
            {item.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
      <span className="score" title="Coincidencia según MusicBrainz">
        {item.score}%
      </span>
    </li>
  )
}
