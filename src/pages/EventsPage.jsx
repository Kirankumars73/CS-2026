import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs, limit, startAfter } from 'firebase/firestore';
import { HiX, HiOutlinePhotograph, HiOutlinePlus, HiChevronDown, HiOutlineCalendar } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadToImageKitOnly } from '../utils/imageUtils';
import EventCard from '../components/ui/event-card';
import './EventsPage.css';

const CATEGORIES = ['All', 'Farewell', 'Festival', 'Trip', 'Sports', 'Cultural', 'Classroom', 'Other'];

const PAGE_SIZE = 10;

export default function EventsPage() {
  const { currentUser, memberProfile, isAdmin, CLASS_ID } = useAuth();
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', category: 'Festival', 
    photo: null, photoPreview: null,
    additionalPhotos: [], additionalPreviews: []
  });

  const fetchEvents = useCallback(async (cursorDoc = null) => {
    try {
      let q;
      if (cursorDoc) {
        q = query(
          collection(db, 'classes', CLASS_ID, 'events'),
          orderBy('createdAt', 'desc'),
          startAfter(cursorDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'classes', CLASS_ID, 'events'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const newEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(prev => cursorDoc ? [...prev, ...newEvents] : newEvents);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, [CLASS_ID]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchEvents(lastDoc);
    setLoadingMore(false);
  };

  const filtered = category === 'All' ? events : events.filter(e => e.category === category);

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Cover photo too large. Max 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo: file, photoPreview: reader.result }));
    reader.readAsDataURL(file);
    setError('');
  };

  const handleAdditionalPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < files.length) {
      setError('Some photos skipped (too large, max 10MB).');
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, additionalPreviews: [...f.additionalPreviews, reader.result] }));
      };
      reader.readAsDataURL(file);
    });

    setForm(f => ({ ...f, additionalPhotos: [...f.additionalPhotos, ...validFiles] }));
  };

  const removeAdditionalPhoto = (index) => {
    setForm(f => {
      const newPhotos = [...f.additionalPhotos];
      newPhotos.splice(index, 1);
      const newPreviews = [...f.additionalPreviews];
      newPreviews.splice(index, 1);
      return { ...f, additionalPhotos: newPhotos, additionalPreviews: newPreviews };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setUploading(true);
    setError('');
    try {
      let photoURL = '';

      if (form.photo) {
        const compressed = await compressImage(form.photo, 1200, 1200, 0.7);
        const fileName = `${Date.now()}_${form.photo.name}`;
        const imagekitPath = `classes/${CLASS_ID}/events`;
        const { url } = await uploadToImageKitOnly(compressed, imagekitPath, fileName);
        photoURL = url;
      }
      
      const additionalPhotoURLs = [];

      if (form.additionalPhotos && form.additionalPhotos.length > 0) {
        for (const file of form.additionalPhotos) {
          const compressed = await compressImage(file, 1200, 1200, 0.7);
          const fileName = `extra_${Date.now()}_${file.name}`;
          const imagekitPath = `classes/${CLASS_ID}/events`;
          const { url } = await uploadToImageKitOnly(compressed, imagekitPath, fileName);
          if (url) additionalPhotoURLs.push(url);
        }
      }

      await addDoc(collection(db, 'classes', CLASS_ID, 'events'), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        category: form.category,
        photoURL,                 // ImageKit URL (single source of truth)
        additionalPhotoURLs,      // ImageKit URLs
        postedBy: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        postedById: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setForm({ title: '', description: '', date: '', category: 'Festival', photo: null, photoPreview: null, additionalPhotos: [], additionalPreviews: [] });
    } catch (err) {
      setError('Failed to post event. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'classes', CLASS_ID, 'events', id));
    // Remove from local state immediately
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">Our journey together</p>
        <h1>Events</h1>
        <p>Farewells, festivals, trips and everything in between: the days that made CS 2026.</p>
      </div>

      {/* Controls */}
      <div className="events__controls">
        <div className="filter-chips">
          {CATEGORIES.map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        {currentUser && (
          <button id="post-event-btn" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <HiOutlinePlus /> Post an event
          </button>
        )}
      </div>

      {/* Events List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineCalendar /></div>
          <h3>No events yet</h3>
          <p>{currentUser ? 'Post the first one: a fest, a trip, the farewell.' : 'Log in to post the first event.'}</p>
        </div>
      ) : (
        <div className="events__list stagger-children">
          {filtered.map((event, index) => (
            <div key={event.id} className="events__item">
              {isAdmin && (
                <button
                  className="btn btn-danger btn-sm events__delete"
                  onClick={() => handleDelete(event.id)}
                  title="Delete event"
                >
                  <HiX /> Delete
                </button>
              )}
              <EventCard event={event} index={index} onGalleryClick={(e) => setViewingEvent(e)} />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && events.length > 0 && (
        <div className="events__load-more">
          <button
            id="events-load-more-btn"
            className="btn btn-ghost events__load-more-btn"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <><span className="spinner" /> Loading...</>
            ) : (
              <><HiChevronDown className="events__load-more-icon" /> Load More Events</>
            )}
          </button>
        </div>
      )}

      {/* Post Event Modal */}
      {showForm && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="login-modal events-modal">
            <button className="modal-close" onClick={() => setShowForm(false)}><HiX /></button>
            <div className="modal-header">
              <div className="modal-logo">Events</div>
              <h2 className="modal-title">Post an event</h2>
              <p className="modal-subtitle">Share a memory with your classmates</p>
            </div>
            {error && <div className="modal-error"><span className="modal-error__mark">!</span> {error}</div>}
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
                    <option key={c} value={c}>{c}</option>
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
                rows={3}
              />
              
              {/* Cover Photo */}
              <label className="events-modal__photo-label">
                <HiOutlinePhotograph />
                {form.photoPreview ? 'Change cover photo' : 'Add cover photo *'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} required={!form.photoPreview} />
              </label>
              {form.photoPreview && (
                <img src={form.photoPreview} alt="preview" className="events-modal__photo-preview" />
              )}
              
              {/* Additional Photos */}
              <div>
                <label className="events-modal__photo-label">
                  <HiOutlinePlus />
                  Add more photos (optional)
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAdditionalPhotosChange} />
                </label>
                
                {form.additionalPreviews.length > 0 && (
                  <div className="events-modal__thumbs">
                    {form.additionalPreviews.map((preview, idx) => (
                      <div key={idx} className="events-modal__thumb">
                        <img src={preview} alt="gallery preview" />
                        <button type="button" onClick={() => removeAdditionalPhoto(idx)} className="events-modal__thumb-remove" aria-label="Remove photo">
                          <HiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button id="submit-event-btn" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={uploading}>
                {uploading ? <><span className="spinner" /> Posting…</> : 'Post event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {viewingEvent && (
        <div className="event-viewer" onClick={e => e.target === e.currentTarget && setViewingEvent(null)}>
          <button className="event-viewer__close" onClick={() => setViewingEvent(null)} aria-label="Close">
            <HiX />
          </button>
          <div className="event-viewer__inner">
            <div className="event-viewer__head">
              <h2 className="event-viewer__title">{viewingEvent.title}</h2>
              <p className="event-viewer__count">
                {(viewingEvent.additionalPhotoURLsImageKit || viewingEvent.additionalPhotoURLs)?.length} photos
              </p>
            </div>

            <div className="event-viewer__grid">
              {/* Use ImageKit URLs if available, otherwise fall back to Firebase URLs */}
              {(viewingEvent.additionalPhotoURLsImageKit || viewingEvent.additionalPhotoURLs)?.map((url, i) => (
                <img key={i} src={url} alt={`${viewingEvent.title} ${i + 1}`} loading="lazy" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
