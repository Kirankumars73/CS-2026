import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { HiX, HiOutlinePhotograph, HiOutlinePlus } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadToBothServices } from '../utils/imageUtils';
import EventCard from '../components/ui/event-card';
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
  const [viewingEvent, setViewingEvent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', date: '', category: 'Festival', 
    photo: null, photoPreview: null,
    additionalPhotos: [], additionalPreviews: []
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
      let photoURLImageKit = '';
      
      if (form.photo) {
        const compressed = await compressImage(form.photo, 1200, 1200, 0.7);
        const fileName = `${Date.now()}_${form.photo.name}`;
        const firebasePath = `classes/${CLASS_ID}/events/${fileName}`;
        const imagekitPath = `classes/${CLASS_ID}/events`;
        
        const { firebaseUrl, imagekitUrl } = await uploadToBothServices(
          compressed,
          firebasePath,
          imagekitPath,
          fileName
        );
        
        photoURL = firebaseUrl;
        photoURLImageKit = imagekitUrl || '';
      }
      
      const additionalPhotoURLs = [];
      const additionalPhotoURLsImageKit = [];
      
      if (form.additionalPhotos && form.additionalPhotos.length > 0) {
        for (const file of form.additionalPhotos) {
          const compressed = await compressImage(file, 1200, 1200, 0.7);
          const fileName = `extra_${Date.now()}_${file.name}`;
          const firebasePath = `classes/${CLASS_ID}/events/${fileName}`;
          const imagekitPath = `classes/${CLASS_ID}/events`;
          
          const { firebaseUrl, imagekitUrl } = await uploadToBothServices(
            compressed,
            firebasePath,
            imagekitPath,
            fileName
          );
          
          additionalPhotoURLs.push(firebaseUrl);
          if (imagekitUrl) {
            additionalPhotoURLsImageKit.push(imagekitUrl);
          }
        }
      }

      await addDoc(collection(db, 'classes', CLASS_ID, 'events'), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        category: form.category,
        photoURL,
        photoURLImageKit,
        additionalPhotoURLs,
        additionalPhotoURLsImageKit,
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
        <div className="events__grid w-full">
          {filtered.map((event, index) => (
            <div key={event.id} className="relative group w-full">
              {isAdmin && (
                <button
                  className="absolute top-4 right-4 z-[100] btn-danger btn btn-sm bg-black/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Post Event Modal */}
      {showForm && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="login-modal events-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
                rows={3}
              />
              
              {/* Cover Photo */}
              <label className="events-modal__photo-label bg-black/20 border border-white/10 p-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-black/30 transition">
                <HiOutlinePhotograph />
                {form.photoPreview ? 'Change Cover Photo' : 'Add Cover Photo*'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} required={!form.photoPreview} />
              </label>
              {form.photoPreview && (
                <img src={form.photoPreview} alt="preview" className="events-modal__photo-preview rounded-lg object-cover h-32 w-full" />
              )}
              
              {/* Additional Photos */}
              <div className="mt-4">
                <label className="events-modal__photo-label bg-black/20 border border-white/10 p-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-black/30 transition">
                  <HiOutlinePlus />
                  Add Additional Photos (Gallery)
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAdditionalPhotosChange} />
                </label>
                
                {form.additionalPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {form.additionalPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden aspect-square">
                        <img src={preview} alt="gallery preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeAdditionalPhoto(idx)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition">
                          <HiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button id="submit-event-btn" type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={uploading}>
                {uploading ? <><span className="spinner" /> Posting...</> : '🎉 Post Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {viewingEvent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 overflow-y-auto" onClick={e => e.target === e.currentTarget && setViewingEvent(null)}>
          <button className="fixed top-6 right-6 z-[10001] text-zinc-400 bg-white/5 p-3 rounded-full hover:bg-white/10 hover:text-white transition" onClick={() => setViewingEvent(null)}>
            <HiX size={26} />
          </button>
          <div className="w-full max-w-6xl my-auto flex flex-col items-center animate-fadeIn">
            <div className="text-center mb-10 w-full">
              <h2 className="text-3xl font-light text-white tracking-tight">{viewingEvent.title}</h2>
              <p className="text-zinc-500 tracking-widest uppercase text-sm mt-3">
                {(viewingEvent.additionalPhotoURLsImageKit || viewingEvent.additionalPhotoURLs)?.length} Gallery Photos
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {/* Use ImageKit URLs if available, otherwise fall back to Firebase URLs */}
              {(viewingEvent.additionalPhotoURLsImageKit || viewingEvent.additionalPhotoURLs)?.map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/5 relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img src={url} alt={`Gallery ${i+1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
