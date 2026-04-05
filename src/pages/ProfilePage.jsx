import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, addDoc, collection,
  query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import { HiOutlineArrowLeft, HiOutlineMail, HiOutlinePencilAlt } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import YearbookMessageModal from '../components/YearbookMessageModal';
import YearbookMessageInbox from '../components/YearbookMessageInbox';
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
  const [sending, setSending] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [toast, setToast] = useState(null);

  // Received messages (only loaded for own profile)
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;
  const isOtherLoggedIn = currentUser && currentUser.uid !== userId;

  /* ── Load profile ── */
  useEffect(() => {
    getDoc(doc(db, 'classes', CLASS_ID, 'members', userId))
      .then(snap => {
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  /* ── Check if current user already sent a message ── */
  useEffect(() => {
    if (!isOtherLoggedIn) return;
    const q = query(
      collection(db, 'yearbook_messages'),
      where('senderId', '==', currentUser.uid),
      where('receiverId', '==', userId)
    );
    getDocs(q).then(snap => setAlreadySent(!snap.empty));
  }, [isOtherLoggedIn, currentUser?.uid, userId]);

  /* ── Load inbox for own profile ── */
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

  /* ── Send message ── */
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
      showToast('💌 Message sent! They\'ll treasure it forever.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send. Try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Helpers ── */
  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', paddingTop: 140 }}>
        <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto' }}></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Profile not found</h3>
          <p>This member hasn't set up their profile yet.</p>
          <button className="btn btn-glass" onClick={() => navigate('/yearbook')} style={{ marginTop: 16 }}>
            Back to Yearbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper profile-page">
      <button className="profile__back btn btn-glass btn-sm" onClick={() => navigate(-1)}>
        <HiOutlineArrowLeft /> Back
      </button>

      <div className="profile__card liquid-glass">
        {/* Cover area */}
        <div className="profile__cover">
          <div className="profile__cover-bg"></div>
          <div className="profile__avatar-wrap">
            {(profile.profilePhotoImageKit || profile.profilePhoto) ? (
              <img src={profile.profilePhotoImageKit || profile.profilePhoto} alt={profile.name} className="profile__avatar" />
            ) : (
              <div className="profile__avatar avatar-placeholder">
                {getInitials(profile.name)}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="profile__body">
          <div className="profile__name-row">
            <h1 className="profile__name">{profile.name || 'Unnamed'}</h1>
            {isOwnProfile && (
              <button className="btn btn-glass btn-sm" onClick={() => navigate('/edit-profile')}>
                <HiOutlinePencilAlt /> Edit
              </button>
            )}
          </div>

          <div className="profile__meta">
            {profile.rollNumber && (
              <span className="badge badge-gold">📋 Roll #{profile.rollNumber}</span>
            )}
          </div>

          {profile.quote && (
            <blockquote className="profile__quote">
              "{profile.quote}"
            </blockquote>
          )}

          {profile.bio && (
            <div className="profile__section">
              <h2 className="profile__section-title">About</h2>
              <p className="profile__bio">{profile.bio}</p>
            </div>
          )}

          {/* ── Actions: send message / email ── */}
          {isOtherLoggedIn && (
            <div className="profile__actions">
              {alreadySent ? (
                <div className="profile__msg-sent">
                  <span>💌</span>
                  <span>You've already left a message here</span>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  ✉️ Leave a Yearbook Message
                </button>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="btn btn-glass">
                  <HiOutlineMail /> Email
                </a>
              )}
            </div>
          )}

          {/* ── Inbox: only shown to the profile owner ── */}
          {isOwnProfile && (
            <div className="profile__section">
              <div className="divider" />
              {inboxLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24 }} />
                </div>
              ) : inbox.length === 0 ? (
                <div className="profile__inbox-empty">
                  <span>📭</span>
                  <p>No messages yet. Your classmates will leave their wishes here.</p>
                </div>
              ) : (
                <YearbookMessageInbox messages={inbox} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showModal && (
        <YearbookMessageModal
          recipientName={profile.name || 'this person'}
          onSend={handleSend}
          onClose={() => !sending && setShowModal(false)}
          sending={sending}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
