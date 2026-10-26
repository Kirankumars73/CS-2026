import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc, getDoc, addDoc, collection,
  query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import {
  HiOutlineArrowLeft, HiOutlineMail, HiOutlinePencil, HiOutlinePencilAlt, HiCheck, HiOutlineLink, HiOutlineSearch,
  HiOutlineBriefcase, HiOutlineLocationMarker, HiOutlineCake,
} from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import YearbookMessageModal from '../components/YearbookMessageModal';
import LoginModal from '../components/LoginModal';
import SlamBook from '../components/SlamBook';
import Signatures from '../components/Signatures';
import { portraitUrl } from '../utils/imageUtils';
import { fetchDetails, formatBirthday, cityLabel } from '../utils/details';
import './ProfilePage.css';

const CLASS_ID = import.meta.env.VITE_CLASS_ID || 'cs2026';

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, memberProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Compose modal
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sending, setSending] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [toast, setToast] = useState(null);

  // Members-only details (birthday, city, now, email), visible to signed-in classmates
  const [details, setDetails] = useState(null);

  // Received signatures (only loaded for own profile)
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;
  const isOtherLoggedIn = currentUser && currentUser.uid !== userId;

  /* ── Helpers ── */
  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const firstName = (profile?.name || 'them').split(' ')[0];

  /* ── Load profile ── */
  useEffect(() => {
    getDoc(doc(db, 'classes', CLASS_ID, 'members', userId))
      .then(snap => {
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  /* ── Load members-only details ── */
  useEffect(() => {
    if (!memberProfile) return;
    fetchDetails(CLASS_ID, userId)
      .then(setDetails)
      .catch(err => console.error('Failed to load details:', err));
  }, [memberProfile, userId]);

  /* ── Check if current user already signed ── */
  useEffect(() => {
    if (!isOtherLoggedIn) return;
    const q = query(
      collection(db, 'yearbook_messages'),
      where('senderId', '==', currentUser.uid),
      where('receiverId', '==', userId)
    );
    getDocs(q).then(snap => setAlreadySent(!snap.empty));
  }, [isOtherLoggedIn, currentUser?.uid, userId]);

  /* ── Load signatures for own profile ── */
  useEffect(() => {
    if (!isOwnProfile || !currentUser) return;
    setInboxLoading(true);
    const q = query(
      collection(db, 'yearbook_messages'),
      where('receiverId', '==', userId)
    );
    getDocs(q).then(snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort newest last
      msgs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
      setInbox(msgs);
    }).finally(() => setInboxLoading(false));
  }, [isOwnProfile, currentUser?.uid, userId]);

  /* ── Sign their yearbook ── */
  const handleSend = async (text) => {
    if (!currentUser || !text.trim()) return;
    setSending(true);
    try {
      // Use the sender's yearbook profile fields — not the Google account defaults
      const yearbookName = memberProfile?.name || currentUser.displayName || 'Anonymous';
      const yearbookPhoto =
        memberProfile?.profilePhotoImageKit ||
        memberProfile?.profilePhoto ||
        currentUser.photoURL ||
        '';

      await addDoc(collection(db, 'yearbook_messages'), {
        senderId: currentUser.uid,
        senderName: yearbookName,
        senderPhotoURL: yearbookPhoto,
        receiverId: userId,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setAlreadySent(true);
      setShowModal(false);
      showToast(`Signed. ${firstName} will see it on their page.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not sign right now. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied. Share it with the class!', 'success');
    } catch {
      showToast('Could not copy the link.', 'error');
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '40px auto' }}></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineSearch /></div>
          <h3>Page not found</h3>
          <p>This classmate hasn’t set up their yearbook page yet.</p>
          <button className="btn btn-glass" onClick={() => navigate('/yearbook')} style={{ marginTop: 16 }}>
            Back to the class
          </button>
        </div>
      </div>
    );
  }

  const photo = profile.profilePhotoImageKit || profile.profilePhoto;
  const hasSlambook = Object.values(profile.slambook || {}).some(v => v?.trim());

  return (
    <div className="page-wrapper profile-page">
      <button className="profile__back" onClick={() => navigate(-1)}>
        <HiOutlineArrowLeft /> Back
      </button>

      <article className="profile">
        <div className="profile__portrait">
          {photo ? (
            <img src={portraitUrl(photo)} alt={profile.name} />
          ) : (
            <div className="profile__initials">{getInitials(profile.name)}</div>
          )}
        </div>

        <div className="profile__main">
          <p className="section-label">
            Class of 2026{profile.rollNumber ? ` · No. ${profile.rollNumber}` : ''}
          </p>
          <h1 className="profile__name">{profile.name || 'Unnamed'}</h1>

          {(details?.now || details?.city || details?.birthday) && (
            <ul className="profile__facts">
              {details.now && <li><HiOutlineBriefcase /> {details.now}</li>}
              {details.city && <li><HiOutlineLocationMarker /> {cityLabel(details.city)}</li>}
              {details.birthday && <li><HiOutlineCake /> {formatBirthday(details.birthday)}</li>}
            </ul>
          )}

          {profile.quote && <blockquote className="profile__quote">“{profile.quote}”</blockquote>}
          {profile.bio && <p className="profile__bio">{profile.bio}</p>}

          <div className="profile__actions">
            {isOwnProfile ? (
              <>
                <Link to="/edit-profile" className="btn btn-primary">
                  <HiOutlinePencilAlt /> Edit my page
                </Link>
                <button className="btn btn-glass" onClick={copyPageLink}>
                  <HiOutlineLink /> Copy my page link
                </button>
              </>
            ) : isOtherLoggedIn ? (
              <>
                {alreadySent ? (
                  <span className="profile__signed"><HiCheck /> You signed {firstName}’s yearbook</span>
                ) : (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <HiOutlinePencil /> Sign {firstName}’s yearbook
                  </button>
                )}
                {(details?.email || profile.email) && (
                  <a href={`mailto:${details?.email || profile.email}`} className="btn btn-glass">
                    <HiOutlineMail /> Email
                  </a>
                )}
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
                <HiOutlinePencil /> Log in to sign {firstName}’s yearbook
              </button>
            )}
          </div>
        </div>
      </article>

      {/* ── Slam book ── */}
      <section className="profile__section">
        <div className="profile__section-head">
          <h2 className="profile__section-title">Slam book</h2>
        </div>
        {hasSlambook ? (
          <SlamBook answers={profile.slambook} />
        ) : isOwnProfile ? (
          <div className="profile__empty">
            <p>Your slam book is empty. Five quick questions, and the class gets to know the real you.</p>
            <Link to="/edit-profile#slambook" className="btn btn-glass btn-sm">Fill my slam book</Link>
          </div>
        ) : (
          <p className="profile__empty-line">{firstName} hasn’t filled in their slam book yet.</p>
        )}
      </section>

      {/* ── Signatures: only shown to the page owner ── */}
      {isOwnProfile && (
        <section className="profile__section">
          <div className="profile__section-head">
            <h2 className="profile__section-title">Signed by the class</h2>
            {inbox.length > 0 && <span className="profile__count">{inbox.length}</span>}
            <span className="profile__private">Only you can see these</span>
          </div>
          {inboxLoading ? (
            <div className="spinner" style={{ margin: '24px auto', display: 'block' }} />
          ) : inbox.length === 0 ? (
            <div className="profile__empty">
              <p>Nobody has signed your yearbook yet. Share your page so classmates can find it.</p>
              <button className="btn btn-glass btn-sm" onClick={copyPageLink}>
                <HiOutlineLink /> Copy my page link
              </button>
            </div>
          ) : (
            <Signatures messages={inbox} />
          )}
        </section>
      )}

      {showModal && (
        <YearbookMessageModal
          recipientName={profile.name || 'this person'}
          onSend={handleSend}
          onClose={() => !sending && setShowModal(false)}
          sending={sending}
        />
      )}

      {showLogin && <LoginModal stayOnPage onClose={() => setShowLogin(false)} />}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
