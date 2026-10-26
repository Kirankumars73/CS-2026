import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, getCountFromServer, query, orderBy, limit } from 'firebase/firestore';
import { HiArrowRight } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { thumbUrl, portraitUrl } from '../utils/imageUtils';
import LoginModal from '../components/LoginModal';
import Birthdays from '../components/Birthdays';
import { fetchAllDetails, birthdaysAround } from '../utils/details';
import './LandingPage.css';

const photoOf = (m) => m.profilePhotoImageKit || m.profilePhoto || '';
const byRoll = (a, b) => (parseInt(a.rollNumber) || Infinity) - (parseInt(b.rollNumber) || Infinity);

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function LandingPage() {
  const { currentUser, memberProfile, CLASS_ID } = useAuth();
  const [members, setMembers] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [counts, setCounts] = useState(null);
  const [latestPhotos, setLatestPhotos] = useState([]);
  const [latestNotes, setLatestNotes] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [details, setDetails] = useState(null);
  const [today] = useState(() => new Date());

  useEffect(() => {
    const col = (name) => collection(db, 'classes', CLASS_ID, name);

    getDocs(col('members')).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byRoll);
      setMembers(list);
      // A different handful of faces on every visit
      setFeatured(shuffled(list.filter(photoOf)).slice(0, 8));
    }).catch(err => console.error('Failed to load members:', err));

    Promise.all(['gallery', 'wall', 'events'].map(name => getCountFromServer(col(name))))
      .then(([photos, notes, events]) => setCounts({
        photos: photos.data().count,
        notes: notes.data().count,
        events: events.data().count,
      }))
      .catch(err => console.error('Failed to count:', err));

    getDocs(query(col('gallery'), orderBy('createdAt', 'desc'), limit(4)))
      .then(snap => setLatestPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load photos:', err));

    getDocs(query(col('wall'), orderBy('createdAt', 'desc'), limit(3)))
      .then(snap => setLatestNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load notes:', err));
  }, [CLASS_ID]);

  // Birthdays are members-only details, so they only load for signed-in classmates
  useEffect(() => {
    if (!memberProfile) return;
    fetchAllDetails(CLASS_ID)
      .then(setDetails)
      .catch(err => console.error('Failed to load birthdays:', err));
  }, [memberProfile, CLASS_ID]);

  // Everyone is on the cover — repeat the faces so the mosaic fills wide screens
  const withPhotos = members.filter(photoOf);
  const mosaic = withPhotos.length ? [...withPhotos, ...withPhotos] : [];

  const birthdays = details ? birthdaysAround(members, details, today) : { today: [], upcoming: [] };
  const hasBirthdays = birthdays.today.length > 0 || birthdays.upcoming.length > 0;

  const figures = [
    { label: 'Classmates', value: members.length },
    { label: 'Years together', value: 4 },
    { label: 'Photos in the gallery', value: counts?.photos },
    { label: 'Notes on the wall', value: counts?.notes },
    { label: 'Events', value: counts?.events },
  ].filter(f => f.value > 0);

  return (
    <div className="landing">
      {/* Cover */}
      <section className="cover">
        <div className="cover__mosaic" aria-hidden="true">
          {mosaic.map((m, i) => (
            <img key={`${m.id}-${i}`} src={thumbUrl(photoOf(m), 160)} alt="" decoding="async" />
          ))}
        </div>
        <div className="cover__shade" aria-hidden="true" />

        <div className="cover__inner">
          <p className="cover__kicker">Computer Science · Batch 2022–26</p>
          <h1 className="cover__title">
            <span className="cover__title-line">Class of</span>
            <span className="cover__year">2026</span>
          </h1>
          <p className="cover__lede">
            {members.length || 67} classmates. Four years. One yearbook to keep.
          </p>
          <div className="cover__actions">
            <Link to="/yearbook" id="view-yearbook-btn" className="btn cover__btn cover__btn--solid">
              Open the yearbook <HiArrowRight />
            </Link>
            {currentUser ? (
              <Link to={`/profile/${currentUser.uid}`} className="btn cover__btn cover__btn--line">
                My page
              </Link>
            ) : (
              <button id="landing-login-btn" className="btn cover__btn cover__btn--line" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            )}
          </div>
        </div>
      </section>

      {/* By the numbers */}
      <section className="numbers">
        <div className="landing__container">
          <p className="section-label">The class, by the numbers</p>
          <dl className="numbers__grid">
            {figures.map(f => (
              <div key={f.label} className="numbers__item">
                <dt className="numbers__label">{f.label}</dt>
                <dd className="numbers__value">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Birthdays (signed-in classmates only; renders nothing when none are near) */}
      {memberProfile && hasBirthdays && (
        <section className="landing__section landing__section--tight">
          <div className="landing__container">
            <div className="landing__head">
              <div>
                <p className="section-label">Birthdays</p>
                <h2 className="landing__title">{birthdays.today.length ? 'Happy birthday!' : 'Coming up'}</h2>
              </div>
            </div>
            <Birthdays today={birthdays.today} upcoming={birthdays.upcoming} />
          </div>
        </section>
      )}

      {/* Portraits */}
      {featured.length > 0 && (
        <section className="landing__section">
          <div className="landing__container">
            <div className="landing__head">
              <div>
                <p className="section-label">Portrait pages</p>
                <h2 className="landing__title">Sign someone’s yearbook</h2>
                <p className="landing__sub">Every classmate has a page. Leave them a few lines they can keep.</p>
              </div>
              <Link to="/yearbook" className="landing__more">All {members.length} classmates <HiArrowRight /></Link>
            </div>
            <div className="portrait-strip">
              {featured.map(m => (
                <Link key={m.id} to={`/profile/${m.id}`} className="portrait-strip__item">
                  <img src={portraitUrl(photoOf(m))} alt={m.name} loading="lazy" />
                  <span className="portrait-strip__name">{m.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest photos */}
      {latestPhotos.length > 0 && (
        <section className="landing__section landing__section--alt">
          <div className="landing__container">
            <div className="landing__head">
              <div>
                <p className="section-label">From the gallery</p>
                <h2 className="landing__title">Latest snapshots</h2>
              </div>
              <Link to="/gallery" className="landing__more">Open the gallery <HiArrowRight /></Link>
            </div>
            <div className="print-row">
              {latestPhotos.map(p => (
                <Link key={p.id} to="/gallery" className="print">
                  <img src={p.imagekitUrl || p.url} alt={p.caption || 'Class photo'} loading="lazy" />
                  {p.caption && <span className="print__caption">{p.caption}</span>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest wall notes */}
      {latestNotes.length > 0 && (
        <section className="landing__section">
          <div className="landing__container">
            <div className="landing__head">
              <div>
                <p className="section-label">On the wall</p>
                <h2 className="landing__title">Notes to the class</h2>
              </div>
              <Link to="/wall" className="landing__more">Read the wall <HiArrowRight /></Link>
            </div>
            <div className="note-row">
              {latestNotes.map(n => (
                <figure key={n.id} className="note-card">
                  <blockquote className="hand note-card__text">{n.message}</blockquote>
                  <figcaption className="note-card__by">— {n.author}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
