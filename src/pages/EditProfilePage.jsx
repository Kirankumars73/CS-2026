import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { HiOutlineCamera, HiOutlineArrowLeft } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadToImageKitOnly } from '../utils/imageUtils';
import { SLAMBOOK_PROMPTS, SLAMBOOK_MAX } from '../utils/slambook';
import './EditProfilePage.css';

const ROLL_NUMBERS = Array.from({ length: 67 }, (_, i) => i + 1);

export default function EditProfilePage() {
  const { currentUser, memberProfile, refreshProfile, CLASS_ID } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const fileRef = useRef();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoPreview, setPhotoPreview] = useState(memberProfile?.profilePhoto || currentUser?.photoURL || '');
  const [form, setForm] = useState({
    name: memberProfile?.name || currentUser?.displayName || '',
    rollNumber: memberProfile?.rollNumber || '',
    bio: memberProfile?.bio || '',
    quote: memberProfile?.quote || '',
  });
  const [slambook, setSlambook] = useState(() =>
    Object.fromEntries(SLAMBOOK_PROMPTS.map(p => [p.key, memberProfile?.slambook?.[p.key] || '']))
  );
  const [newPhoto, setNewPhoto] = useState(null);

  // "Fill my slam book" links straight to that section
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  };

  const handleSlambookChange = (key, value) => {
    setSlambook(s => ({ ...s, [key]: value }));
    setError('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo too large. Max 5MB.'); return; }
    setNewPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.rollNumber) { setError('Roll number is required.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Use ImageKit URL as the single source of truth for profile photos
      let profilePhoto = memberProfile?.profilePhotoImageKit || memberProfile?.profilePhoto || currentUser?.photoURL || '';

      if (newPhoto) {
        setCompressing(true);
        const compressed = await compressImage(newPhoto, 800, 800, 0.7);
        setCompressing(false);

        setUploadingPhoto(true);
        const fileName = `${currentUser.uid}_profile`;
        const imagekitPath = `classes/${CLASS_ID}/profiles`;

        const { url } = await uploadToImageKitOnly(compressed, imagekitPath, fileName);
        profilePhoto = url;
        setUploadingPhoto(false);
      }

      const ref2 = doc(db, 'classes', CLASS_ID, 'members', currentUser.uid);
      await setDoc(ref2, {
        name: form.name.trim(),
        rollNumber: form.rollNumber.toString(),
        bio: form.bio.trim(),
        quote: form.quote.trim(),
        slambook: Object.fromEntries(SLAMBOOK_PROMPTS.map(p => [p.key, slambook[p.key].trim()])),
        profilePhoto,           // ImageKit URL (single source of truth)
        profilePhotoImageKit: profilePhoto, // keep in sync for any older reads
        email: currentUser.email,
        uid: currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await refreshProfile();
      setSuccess('Saved. Taking you to your page…');
      setTimeout(() => navigate(`/profile/${currentUser.uid}`), 1200);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
      setCompressing(false);
    }
  };

  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-wrapper edit-profile-page">
      <button className="edit-profile__back" onClick={() => navigate(-1)}>
        <HiOutlineArrowLeft /> Back
      </button>

      <div className="page-header">
        <p className="section-label">Your page</p>
        <h1>Edit my page</h1>
        <p>This is how the class will remember you. Keep it honest, keep it you.</p>
      </div>

      <form className="edit-profile__form" onSubmit={handleSave}>
        {/* Portrait + basics */}
        <section className="edit-profile__block edit-profile__basics">
          <div className="edit-profile__photo-section">
            <button type="button" className="edit-profile__photo-wrap" onClick={() => fileRef.current.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="Your portrait" className="edit-profile__photo" />
              ) : (
                <div className="edit-profile__photo edit-profile__initials">{getInitials(form.name)}</div>
              )}
              <span className="edit-profile__photo-overlay">
                <HiOutlineCamera className="edit-profile__camera-icon" />
                {compressing ? 'Compressing…' : uploadingPhoto ? 'Uploading…' : 'Change photo'}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <p className="edit-profile__photo-hint">Max 5 MB, compressed automatically</p>
          </div>

          <div className="edit-profile__fields">
            <div className="edit-profile__row">
              <div className="edit-profile__field">
                <label className="edit-profile__label" htmlFor="profile-name">Full name *</label>
                <input
                  id="profile-name"
                  type="text"
                  className="input-glass"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="edit-profile__field edit-profile__field--roll">
                <label className="edit-profile__label" htmlFor="profile-roll">Roll no. *</label>
                <select
                  id="profile-roll"
                  className="input-glass"
                  value={form.rollNumber}
                  onChange={e => handleChange('rollNumber', e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {ROLL_NUMBERS.map(n => (
                    <option key={n} value={n.toString()}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="profile-quote">Yearbook quote</label>
              <input
                id="profile-quote"
                type="text"
                className="input-glass"
                placeholder='e.g. "Make it count."'
                value={form.quote}
                onChange={e => handleChange('quote', e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="profile-bio">About me</label>
              <textarea
                id="profile-bio"
                className="input-glass"
                placeholder="Tell your classmates about yourself…"
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={4}
                maxLength={500}
              />
              <span className="edit-profile__char-count">{form.bio.length}/500</span>
            </div>
          </div>
        </section>

        {/* Slam book */}
        <section className="edit-profile__block" id="slambook">
          <div className="edit-profile__block-head">
            <h2 className="edit-profile__block-title">Slam book</h2>
            <p>Answer any you like. They show up on your page in your “handwriting”.</p>
          </div>
          <div className="edit-profile__slambook">
            {SLAMBOOK_PROMPTS.map(p => (
              <div key={p.key} className="edit-profile__field">
                <label className="edit-profile__label" htmlFor={`slambook-${p.key}`}>{p.label}</label>
                <input
                  id={`slambook-${p.key}`}
                  type="text"
                  className="input-glass edit-profile__hand-input"
                  placeholder={p.placeholder}
                  value={slambook[p.key]}
                  onChange={e => handleSlambookChange(p.key, e.target.value)}
                  maxLength={SLAMBOOK_MAX}
                />
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="modal-error">
            <span className="modal-error__mark">!</span> {error}
          </div>
        )}
        {success && <div className="edit-profile__success">{success}</div>}

        <div className="edit-profile__submit">
          <button
            id="save-profile-btn"
            type="submit"
            className="btn btn-primary edit-profile__save-btn"
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner" /> {compressing ? 'Compressing photo…' : uploadingPhoto ? 'Uploading photo…' : 'Saving…'}</>
            ) : (
              'Save my page'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
