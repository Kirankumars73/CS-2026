import { Link } from 'react-router-dom';
import { cityLabel } from '../utils/details';
import { portraitUrl } from '../utils/imageUtils';
import './WhereNow.css';

const NO_CITY = 'City not added';
const photoOf = (m) => m.profilePhotoImageKit || m.profilePhoto || '';
const initials = (name) => (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// Class directory grouped by city: who's where, doing what
export default function WhereNow({ members, details, search = '', currentUserId }) {
  const q = search.trim().toLowerCase();
  const rows = members.map(m => {
    const d = details[m.id] || {};
    return { ...m, city: cityLabel(d.city), now: (d.now || '').trim() };
  });

  const updated = rows.filter(r => r.city || r.now);
  const missing = rows.filter(r => !r.city && !r.now);
  const matches = (r) => !q || [r.name, r.city, r.now].some(v => v?.toLowerCase().includes(q));

  // Biggest cities first; "City not added" last
  const groups = {};
  for (const r of updated.filter(matches)) (groups[r.city || NO_CITY] ||= []).push(r);
  const ordered = Object.entries(groups).sort(([a, ra], [b, rb]) =>
    (a === NO_CITY) - (b === NO_CITY) || rb.length - ra.length || a.localeCompare(b)
  );
  const missingShown = missing.filter(matches);
  const youAreMissing = missing.some(m => m.id === currentUserId);

  return (
    <div className="where-now">
      {youAreMissing && (
        <div className="where-now__nudge">
          <span>You haven’t added where you are now.</span>
          <Link to="/edit-profile#now" className="btn btn-glass btn-sm">Add mine</Link>
        </div>
      )}

      {ordered.length === 0 && missingShown.length === 0 && (
        <p className="where-now__empty">Nobody matches “{search}”.</p>
      )}

      {ordered.map(([city, people]) => (
        <section key={city} className="where-now__group">
          <h3 className="where-now__city">
            {city} <span className="where-now__count">{people.length}</span>
          </h3>
          <ul className="where-now__list">
            {people.map(p => (
              <li key={p.id}>
                <Link to={`/profile/${p.id}`} className="where-now__person">
                  {photoOf(p) ? (
                    <img src={portraitUrl(photoOf(p))} alt="" className="where-now__photo" loading="lazy" />
                  ) : (
                    <span className="where-now__photo where-now__photo--initials">{initials(p.name)}</span>
                  )}
                  <span className="where-now__text">
                    <span className="where-now__name">{p.name}</span>
                    {p.now && <span className="where-now__doing">{p.now}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {missingShown.length > 0 && (
        <section className="where-now__group where-now__group--missing">
          <h3 className="where-now__city">
            Not updated yet <span className="where-now__count">{missingShown.length}</span>
          </h3>
          <p className="where-now__missing">
            {missingShown.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ', '}
                <Link to={`/profile/${m.id}`}>{m.name}</Link>
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}
