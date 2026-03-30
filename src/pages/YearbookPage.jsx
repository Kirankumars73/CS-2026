import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { HiOutlineSearch, HiOutlinePencil } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './YearbookPage.css';

export default function YearbookPage() {
  const { currentUser, isAdmin, CLASS_ID } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'classes', CLASS_ID, 'members'));
    const unsub = onSnapshot(q, snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [CLASS_ID]);

  // Filter by search
  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.rollNumber?.toString().includes(search);
    return matchSearch;
  });

  // Sort by roll number (ascending), members without roll go to the end
  const sorted = [...filtered].sort((a, b) => {
    const ra = parseInt(a.rollNumber) || Infinity;
    const rb = parseInt(b.rollNumber) || Infinity;
    return ra - rb;
  });

  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">Class of 2022–26</p>
        <h1>Our Yearbook</h1>
        <p>Meet the brilliant minds of CS 2026 — 67 classmates, one family.</p>
      </div>

      {/* Controls */}
      <div className="yearbook__controls">
        <div className="yearbook__search">
          <HiOutlineSearch className="search-icon" />
          <input
            id="yearbook-search"
            type="text"
            className="input-glass yearbook__search-input"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Not logged in hint */}
      {!currentUser && (
        <div className="yearbook__login-hint glass-card">
          🔑 <span>Login to add your profile and edit your information</span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 40, height: 40 }}></div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎓</div>
          <h3>{search ? 'No members match this filter' : 'No profiles yet'}</h3>
          <p>{search ? 'Try adjusting your search' : 'Be the first to create your yearbook profile!'}</p>
        </div>
      ) : (
        <div className="yearbook__grid stagger-children">
          {sorted.map(member => (
            <Link key={member.id} to={`/profile/${member.id}`} className="member-card clay-card">
              {/* Roll Number Badge */}
              {member.rollNumber && (
                <div className="member-card__roll-badge">#{member.rollNumber}</div>
              )}
              {/* Photo */}
              <div className="member-card__photo-wrap">
                {member.profilePhoto ? (
                  <img src={member.profilePhoto} alt={member.name} className="member-card__photo" />
                ) : (
                  <div className="member-card__photo avatar-placeholder">
                    {getInitials(member.name)}
                  </div>
                )}
                {currentUser && currentUser.uid === member.id && (
                  <button
                    className="member-card__edit-btn"
                    onClick={e => { e.preventDefault(); navigate('/edit-profile'); }}
                    title="Edit Profile"
                  >
                    <HiOutlinePencil />
                  </button>
                )}
              </div>
              {/* Info */}
              <div className="member-card__info">
                <h3 className="member-card__name">{member.name || 'Unnamed'}</h3>
                {member.rollNumber && (
                  <p className="member-card__roll">Roll #{member.rollNumber}</p>
                )}
                {member.quote && (
                  <p className="member-card__quote">"{member.quote}"</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
