import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs, limit, startAfter, getDoc } from 'firebase/firestore';
import { HiOutlineUpload, HiX, HiOutlineZoomIn, HiChevronLeft, HiChevronRight, HiChevronDown } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../utils/imageUtils';
import { uploadToImageKit } from '../imagekit';
import './GalleryPage.css';

const CATEGORIES = ['All', 'Classroom', 'Trip', 'Festival', 'Sports', 'Cultural', 'Farewell', 'Other'];

const PAGE_SIZE = 10;

export default function GalleryPage() {
  const { currentUser, isAdmin, memberProfile, CLASS_ID } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fileRef = useRef();

  const fetchPhotos = useCallback(async (cursorDoc = null) => {
    try {
      let q;
      if (cursorDoc) {
        q = query(
          collection(db, 'classes', CLASS_ID, 'gallery'),
          orderBy('createdAt', 'desc'),
          startAfter(cursorDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'classes', CLASS_ID, 'gallery'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const newPhotos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhotos(prev => cursorDoc ? [...prev, ...newPhotos] : newPhotos);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch gallery:', err);
    }
  }, [CLASS_ID]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPhotos(lastDoc);
    setLoadingMore(false);
  };

  // Client-side filter on the already-fetched photos
  const filtered = category === 'All' ? photos : photos.filter(p => p.category === category);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10MB.'); return; }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setError('Please select a photo.'); return; }
    setUploading(true);
    setError('');
    try {
      // Compress image before upload
      const compressed = await compressImage(uploadFile, 1200, 1200, 0.7);
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const imagekitPath = `classes/${CLASS_ID}/gallery`;
      
      // Upload to ImageKit only
      const { url: imagekitUrl } = await uploadToImageKit(
        compressed, 
        fileName,
        imagekitPath
      );
      
      const newDocRef = await addDoc(collection(db, 'classes', CLASS_ID, 'gallery'), {
        imagekitUrl: imagekitUrl,
        url: imagekitUrl, // Store as url for backwards compatibility
        caption: uploadCaption.trim(),
        category: uploadCategory,
        uploadedBy: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        uploadedById: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      // Optimistically prepend new photo to local state so it's immediately visible
      const newDocSnap = await getDoc(newDocRef);
      setPhotos(prev => [{ id: newDocSnap.id, ...newDocSnap.data() }, ...prev]);
      setUploadModal(false);
      setUploadFile(null);
      setPreview(null);
      setUploadCaption('');
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('ImageKit upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo permanently?')) return;
    await deleteDoc(doc(db, 'classes', CLASS_ID, 'gallery', id));
    // Remove from local state immediately
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const goLightbox = (dir) => {
    const idx = filtered.findIndex(p => p.id === lightbox.id);
    const next = (idx + dir + filtered.length) % filtered.length;
    setLightbox(filtered[next]);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <p className="section-label">Visual Memories</p>
        <h1>Photo Gallery</h1>
        <p>Snapshots of our journey — classes, trips, festivals, and more.</p>
      </div>

      {/* Controls */}
      <div className="gallery__controls">
        <div className="filter-chips">
          {CATEGORIES.map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        {currentUser && (
          <button id="upload-photo-btn" className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>
            <HiOutlineUpload /> Upload Photo
          </button>
        )}
      </div>

      {/* Masonry Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📷</div>
          <h3>No photos yet</h3>
          <p>{currentUser ? 'Upload the first photo to get started!' : 'Login to upload photos.'}</p>
        </div>
      ) : (
        <div className="gallery__grid stagger-children">
          {filtered.map(photo => (
            <div key={photo.id} className="gallery-item clay-card" onClick={() => setLightbox(photo)}>
              <img 
                src={photo.imagekitUrl || photo.url} 
                alt={photo.caption} 
                className="gallery-item__img" 
                loading="lazy" 
              />
              <div className="gallery-item__overlay">
                <HiOutlineZoomIn className="gallery-item__zoom" />
                {photo.caption && <p className="gallery-item__caption">{photo.caption}</p>}
                <span className="badge badge-gold gallery-item__cat">{photo.category}</span>
              </div>
              {isAdmin && (
                <button
                  className="gallery-item__delete"
                  onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                  title="Delete"
                >
                  <HiX />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && photos.length > 0 && (
        <div className="gallery__load-more">
          <button
            id="gallery-load-more-btn"
            className="btn btn-ghost gallery__load-more-btn"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <><span className="spinner" /> Loading...</>
            ) : (
              <><HiChevronDown className="gallery__load-more-icon" /> Load More Photos</>
            )}
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUploadModal(false)}>
          <div className="login-modal" style={{ maxWidth: 500 }}>
            <button className="modal-close" onClick={() => setUploadModal(false)}><HiX /></button>
            <div className="modal-header">
              <div className="modal-logo">📷</div>
              <h2 className="modal-title">Upload Photo</h2>
            </div>
            {error && <div className="modal-error"><span>⚠️</span> {error}</div>}
            <form className="modal-body" onSubmit={handleUpload}>
              {/* Drop zone */}
              <div className="gallery-dropzone" onClick={() => fileRef.current.click()}>
                {preview ? (
                  <img src={preview} alt="preview" className="gallery-dropzone__preview" />
                ) : (
                  <>
                    <HiOutlineUpload className="gallery-dropzone__icon" />
                    <p>Click to select a photo (max 10MB)</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <input
                type="text"
                className="input-glass"
                placeholder="Caption (optional)..."
                value={uploadCaption}
                onChange={e => setUploadCaption(e.target.value)}
              />
              <select
                className="input-glass"
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={uploading}>
                {uploading ? <><span className="spinner" /> Uploading...</> : 'Upload Photo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox__close" onClick={() => setLightbox(null)}><HiX /></button>
          <button className="lightbox__nav lightbox__nav--prev" onClick={e => { e.stopPropagation(); goLightbox(-1); }}>
            <HiChevronLeft />
          </button>
          <div className="lightbox__content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.imagekitUrl || lightbox.url} alt={lightbox.caption} className="lightbox__img" />
            {lightbox.caption && <p className="lightbox__caption">{lightbox.caption}</p>}
            <div className="lightbox__meta">
              <span className="badge badge-gold">{lightbox.category}</span>
              <span className="lightbox__author">By {lightbox.uploadedBy}</span>
            </div>
          </div>
          <button className="lightbox__nav lightbox__nav--next" onClick={e => { e.stopPropagation(); goLightbox(1); }}>
            <HiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
