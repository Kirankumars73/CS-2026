import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { HiX, HiOutlinePencilAlt } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './WallPage.css';

const COLORS = ['#FFE066', '#B5EAD7', '#FF9AA2', '#C7CEEA', '#FFDAC1', '#E2F0CB', '#FFB7B2', '#B5B9FF'];
const ROTATIONS = [-3, -2, -1, 0, 1, 2, 3, 2.5, -2.5];

export default function WallPage() {
  const { currentUser, memberProfile, isAdmin, CLASS_ID } = useAuth();
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', CLASS_ID, 'wall'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [CLASS_ID]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!message.trim()) { setError('Please write something!'); return; }
    setPosting(true);
    setError('');
    try {
      await addDoc(collection(db, 'classes', CLASS_ID, 'wall'), {
        message: message.trim(),
        author: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        authorId: currentUser.uid,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)],
        createdAt: serverTimestamp(),
      });
      setMessage('');
      setShowForm(false);
    } catch (err) {
      setError('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await deleteDoc(doc(db, 'classes', CLASS_ID, 'wall', id));
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">Community Board</p>
        <h1>Memory Wall</h1>
        <p>Leave your mark — notes, wishes, memories for the Class of 2026.</p>
      </div>

      {/* Actions */}
      <div className="wall__actions">
        {currentUser ? (
          <button id="add-note-btn" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <HiOutlinePencilAlt /> Add a Note
          </button>
        ) : (
          <p className="wall__login-hint glass-card">🔑 Login to leave a note on the wall</p>
        )}
      </div>

      {/* Add Note Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="login-modal" style={{ maxWidth: 460 }}>
            <button className="modal-close" onClick={() => setShowForm(false)}><HiX /></button>
            <div className="modal-header">
              <div className="modal-logo">📝</div>
              <h2 className="modal-title">Leave a Note</h2>
              <p className="modal-subtitle">Write something heartfelt for your classmates</p>
            </div>
            {error && <div className="modal-error"><span>⚠️</span> {error}</div>}
            <form className="modal-body" onSubmit={handlePost}>
              <textarea
                id="wall-note-input"
                className="input-glass"
                placeholder="Write your message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                maxLength={500}
                autoFocus
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {message.length}/500
              </div>
              <button id="post-note-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={posting}>
                {posting ? <><span className="spinner" /> Posting...</> : '📌 Post Note'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>Wall is empty</h3>
          <p>Be the first to leave a note!</p>
        </div>
      ) : (
        <div className="wall__grid stagger-children">
          {notes.map(note => (
            <div
              key={note.id}
              className="sticky-note"
              style={{
                '--note-color': note.color || '#FFE066',
                '--note-rotation': `${note.rotation || 0}deg`,
              }}
            >
              <p className="sticky-note__message">{note.message}</p>
              <div className="sticky-note__footer">
                <span className="sticky-note__author">— {note.author}</span>
                <span className="sticky-note__date">{formatDate(note.createdAt)}</span>
              </div>
              {(isAdmin || currentUser?.uid === note.authorId) && (
                <button
                  className="sticky-note__delete"
                  onClick={() => handleDelete(note.id)}
                  title="Delete"
                >
                  <HiX />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
