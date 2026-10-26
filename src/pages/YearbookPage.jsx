import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { HiOutlineSearch, HiOutlinePencil, HiOutlineUserGroup } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';
import { portraitUrl } from '../utils/imageUtils';
import './YearbookPage.css';

export default function YearbookPage() {
  const { currentUser, CLASS_ID } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
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
        <p className="section-label">Portrait pages · Class of 2022–26</p>
        <h1>The Class</h1>
        <p>
          {members.length || 67} classmates, in roll-number order. Open anyone’s page to read their slam book
          and sign their yearbook.
        </p>
      </div>

      {/* Controls */}
      <div className="yearbook__controls">
        <div className="yearbook__search">
          <HiOutlineSearch className="search-icon" />
          <input
            id="yearbook-search"
            type="text"
            className="input-glass yearbook__search-input"
            placeholder="Search by name or roll number"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!currentUser && (
          <div className="yearbook__login-hint">
            <span>Log in to add your portrait and sign yearbooks.</span>
            <button className="btn btn-glass btn-sm" onClick={() => setShowLogin(true)}>Log in</button>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 36, height: 36 }}></div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineUserGroup /></div>
          <h3>{search ? 'Nobody by that name' : 'No portraits yet'}</h3>
          <p>{search ? 'Try a different name or roll number.' : 'Be the first to add your yearbook portrait.'}</p>
        </div>
      ) : (
        <div className="yearbook__grid">
          {sorted.map(member => (
            <Link key={member.id} to={`/profile/${member.id}`} className="portrait">
              <div className="portrait__photo">
                {(member.profilePhotoImageKit || member.profilePhoto) ? (
                  <img src={portraitUrl(member.profilePhotoImageKit || member.profilePhoto)} alt={member.name} loading="lazy" />
                ) : (
                  <div className="portrait__initials">{getInitials(member.name)}</div>
                )}
                {currentUser && currentUser.uid === member.id && (
                  <button
                    className="portrait__edit"
                    onClick={e => { e.preventDefault(); navigate('/edit-profile'); }}
                    title="Edit your profile"
                  >
                    <HiOutlinePencil />
                  </button>
                )}
              </div>
              {member.rollNumber && <p className="portrait__no">No. {member.rollNumber}</p>}
              <h3 className="portrait__name">{member.name || 'Unnamed'}</h3>
              {member.quote && <p className="portrait__quote">“{member.quote}”</p>}
            </Link>
          ))}
        </div>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
