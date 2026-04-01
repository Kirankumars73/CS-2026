import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { HiOutlineArrowLeft, HiOutlineChatAlt2, HiOutlineMail } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const CLASS_ID = import.meta.env.VITE_CLASS_ID || 'cs2026';

  useEffect(() => {
    getDoc(doc(db, 'classes', CLASS_ID, 'members', userId))
      .then(snap => {
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
      })
      .finally(() => setLoading(false));
  }, [userId, CLASS_ID]);

  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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
            {currentUser?.uid === userId && (
              <button className="btn btn-glass btn-sm" onClick={() => navigate('/edit-profile')}>
                ✏️ Edit
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

          {/* Actions */}
          {currentUser && currentUser.uid !== userId && (
            <div className="profile__actions">
              <button className="btn btn-primary" onClick={() => navigate(`/dm?user=${userId}`)}>
                <HiOutlineChatAlt2 /> Send Message
              </button>
              <a href={`mailto:${profile.email}`} className="btn btn-glass">
                <HiOutlineMail /> Email
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
