import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { HiX, HiOutlineCalendar, HiOutlinePhotograph, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './EventsPage.css';

const CATEGORIES = ['All', 'Farewell', 'Festival', 'Trip', 'Sports', 'Cultural', 'Classroom', 'Other'];
const CATEGORY_ICONS = {
  Farewell: '🎓', Festival: '🎉', Trip: '🗺️', Sports: '🏆',
  Cultural: '🎭', Classroom: '📚', Other: '✨', All: '🌟',
};

export default function EventsPage() {
  const { currentUser, memberProfile, isAdmin, CLASS_ID } = useAuth();
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', date: '', category: 'Festival', photo: null, photoPreview: null,
  });

  useEffect(() => {
    const q = query(collection(db, 'classes', CLASS_ID, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [CLASS_ID]);

  const filtered = category === 'All' ? events : events.filter(e => e.category === category);

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Photo too large. Max 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo: file, photoPreview: reader.result }));
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setUploading(true);
    setError('');
    try {
      let photoURL = '';
      if (form.photo) {
        const storageRef = ref(storage, `classes/${CLASS_ID}/events/${Date.now()}_${form.photo.name}`);
        await uploadBytes(storageRef, form.photo);
        photoURL = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, 'classes', CLASS_ID, 'events'), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        category: form.category,
        photoURL,
        postedBy: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        postedById: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setForm({ title: '', description: '', date: '', category: 'Festival', photo: null, photoPreview: null });
    } catch (err) {
      setError('Failed to post event. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'classes', CLASS_ID, 'events', id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">Our Journey Together</p>
        <h1>Events & Festivals</h1>
        <p>Relive the moments that made CS 2026 unforgettable — farewells, festivals, trips, and more.</p>
      </div>

      {/* Controls */}
      <div className="events__controls">
        <div className="filter-chips">
          {CATEGORIES.map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {CATEGORY_ICONS[c]} {c}
            </button>
          ))}
        </div>
        {currentUser && (
          <button id="post-event-btn" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            + Post Event
          </button>
        )}
      </div>

      {/* Events List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <h3>No events yet</h3>
          <p>{currentUser ? 'Post the first event!' : 'Login to post events.'}</p>
        </div>
      ) : (
        <div className="events__list stagger-children">
          {filtered.map(event => (
            <div key={event.id} className="event-card liquid-glass">
              {/* Photo */}
              {event.photoURL && (
                <div className="event-card__photo-wrap">
                  <img src={event.photoURL} alt={event.title} className="event-card__photo" />
                </div>
              )}
              <div className="event-card__body">
                {/* Header */}
                <div className="event-card__header">
                  <div className="event-card__badges">
                    <span className="badge badge-gold">{CATEGORY_ICONS[event.category]} {event.category}</span>
                    {event.date && (
                      <span className="event-card__date">
                        <HiOutlineCalendar /> {formatDate(event.date)}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      className="event-card__delete btn-danger btn btn-sm"
                      onClick={() => handleDelete(event.id)}
                      title="Delete event"
                    >
                      <HiX />
                    </button>
                  )}
                </div>
                {/* Title */}
                <h2 className="event-card__title">{event.title}</h2>
                {/* Description */}
                {event.description && (
                  <div className={`event-card__desc ${expanded === event.id ? 'expanded' : ''}`}>
                    {event.description}
                  </div>
                )}
                {event.description && event.description.length > 200 && (
                  <button
                    className="event-card__expand-btn"
                    onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                  >
                    {expanded === event.id ? <><HiOutlineChevronUp /> Show less</> : <><HiOutlineChevronDown /> Read more</>}
                  </button>
                )}
                {/* Footer */}
                <div className="event-card__footer">
                  <span className="event-card__by">Posted by <strong>{event.postedBy}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Event Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="login-modal events-modal">
            <button className="modal-close" onClick={() => setShowForm(false)}><HiX /></button>
            <div className="modal-header">
              <div className="modal-logo">🎉</div>
              <h2 className="modal-title">Post an Event</h2>
              <p className="modal-subtitle">Share a memory with your classmates</p>
            </div>
            {error && <div className="modal-error"><span>⚠️</span> {error}</div>}
            <form className="modal-body" onSubmit={handleSubmit}>
              <input
                id="event-title-input"
                type="text"
                className="input-glass"
                placeholder="Event title*"
                value={form.title}
                onChange={e => handleFormChange('title', e.target.value)}
                required
              />
              <div className="events-modal__row">
                <select
                  className="input-glass"
                  value={form.category}
                  onChange={e => handleFormChange('category', e.target.value)}
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input-glass"
                  value={form.date}
                  onChange={e => handleFormChange('date', e.target.value)}
                />
              </div>
              <textarea
                id="event-desc-input"
                className="input-glass"
                placeholder="Describe the event... (optional)"
                value={form.description}
                onChange={e => handleFormChange('description', e.target.value)}
                rows={4}
              />
              {/* Photo upload */}
              <label className="events-modal__photo-label">
                <HiOutlinePhotograph />
                {form.photoPreview ? 'Change group photo' : 'Add group photo (optional)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </label>
              {form.photoPreview && (
                <img src={form.photoPreview} alt="preview" className="events-modal__photo-preview" />
              )}
              <button id="submit-event-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={uploading}>
                {uploading ? <><span className="spinner" /> Posting...</> : '🎉 Post Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
