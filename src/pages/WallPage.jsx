import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { HiX, HiOutlinePencilAlt, HiOutlineChatAlt } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';
import './WallPage.css';

export default function WallPage() {
  const { currentUser, memberProfile, isAdmin, CLASS_ID } = useAuth();
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
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
        createdAt: serverTimestamp(),
      });
      setMessage('');
      setShowForm(false);
    } catch {
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
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">The wall</p>
        <h1>Notes to the class</h1>
        <p>A memory, a thank-you, an inside joke. Leave a note everyone can read.</p>
      </div>

      <div className="wall__actions">
        {currentUser ? (
          <button id="add-note-btn" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <HiOutlinePencilAlt /> Write a note
          </button>
        ) : (
          <div className="wall__login-hint">
            <span>Log in to leave a note on the wall.</span>
            <button className="btn btn-glass btn-sm" onClick={() => setShowLogin(true)}>Log in</button>
          </div>
        )}
        {notes.length > 0 && <span className="wall__count">{notes.length} notes</span>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="login-modal" style={{ maxWidth: 500 }}>
            <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close"><HiX /></button>
            <div className="modal-header">
              <div className="modal-logo">Wall</div>
              <h2 className="modal-title">Write a note</h2>
              <p className="modal-subtitle">Everyone in the class will see it on the wall.</p>
            </div>
            {error && <div className="modal-error"><span className="modal-error__mark">!</span> {error}</div>}
            <form className="modal-body" onSubmit={handlePost}>
              <textarea
                id="wall-note-input"
                className="input-glass hand wall__textarea"
                placeholder="Dear class,"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                maxLength={500}
                autoFocus
              />
              <div className="wall__char-count">{message.length}/500</div>
              <button id="post-note-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={posting}>
                {posting ? <><span className="spinner" /> Posting…</> : 'Pin it to the wall'}
              </button>
            </form>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineChatAlt /></div>
          <h3>The wall is empty</h3>
          <p>Be the first to leave a note.</p>
        </div>
      ) : (
        <div className="wall__grid stagger-children">
          {notes.map(note => (
            <figure key={note.id} className="wall-note">
              <blockquote className="hand wall-note__message">{note.message}</blockquote>
              <figcaption className="wall-note__footer">
                <span className="wall-note__author">— {note.author}</span>
                <span className="wall-note__date">{formatDate(note.createdAt)}</span>
              </figcaption>
              {(isAdmin || currentUser?.uid === note.authorId) && (
                <button
                  className="wall-note__delete"
                  onClick={() => handleDelete(note.id)}
                  title="Delete note"
                  aria-label="Delete note"
                >
                  <HiX />
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {showLogin && <LoginModal stayOnPage onClose={() => setShowLogin(false)} />}
    </div>
  );
}
