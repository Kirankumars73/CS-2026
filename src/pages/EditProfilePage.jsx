import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { HiOutlineCamera, HiOutlineSave, HiOutlineArrowLeft } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadToBothServices } from '../utils/imageUtils';
import './EditProfilePage.css';

const ROLL_NUMBERS = Array.from({ length: 67 }, (_, i) => i + 1);

export default function EditProfilePage() {
  const { currentUser, memberProfile, refreshProfile, CLASS_ID } = useAuth();
  const navigate = useNavigate();
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
  const [newPhoto, setNewPhoto] = useState(null);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
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
      let profilePhoto = memberProfile?.profilePhoto || currentUser?.photoURL || '';
      let profilePhotoImageKit = memberProfile?.profilePhotoImageKit || '';
      
      if (newPhoto) {
        // Compress the image before uploading
        setCompressing(true);
        const compressed = await compressImage(newPhoto, 800, 800, 0.7);
        setCompressing(false);

        setUploadingPhoto(true);
        const fileName = `${currentUser.uid}_profile`;
        const firebasePath = `classes/${CLASS_ID}/profiles/${currentUser.uid}`;
        const imagekitPath = `classes/${CLASS_ID}/profiles`;
        
        // Upload to both services
        const { firebaseUrl, imagekitUrl } = await uploadToBothServices(
          compressed,
          firebasePath,
          imagekitPath,
          fileName
        );
        
        profilePhoto = firebaseUrl;
        profilePhotoImageKit = imagekitUrl || '';
        setUploadingPhoto(false);
      }
      
      const ref2 = doc(db, 'classes', CLASS_ID, 'members', currentUser.uid);
      await setDoc(ref2, {
        name: form.name.trim(),
        rollNumber: form.rollNumber.toString(),
        bio: form.bio.trim(),
        quote: form.quote.trim(),
        profilePhoto,
        profilePhotoImageKit,
        email: currentUser.email,
        uid: currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await refreshProfile();
      setSuccess('Profile saved successfully! 🎉');
      setTimeout(() => navigate('/yearbook'), 1500);
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
      <button className="btn btn-glass btn-sm edit-profile__back" onClick={() => navigate(-1)}>
        <HiOutlineArrowLeft /> Back
      </button>

      <div className="page-header">
        <p className="section-label">Your Space</p>
        <h1>Edit Profile</h1>
        <p>Make your yearbook profile truly yours.</p>
      </div>

      <div className="edit-profile__card liquid-glass">
        {/* Photo Section */}
        <div className="edit-profile__photo-section">
          <div className="edit-profile__photo-wrap" onClick={() => fileRef.current.click()}>
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="edit-profile__photo" />
            ) : (
              <div className="edit-profile__photo avatar-placeholder">
                {getInitials(form.name)}
              </div>
            )}
            <div className="edit-profile__photo-overlay">
              <HiOutlineCamera className="edit-profile__camera-icon" />
              <span>{compressing ? 'Compressing...' : uploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <p className="edit-profile__photo-hint">Click photo to upload (max 5MB, auto-compressed)</p>
        </div>

        {/* Form */}
        {error && (
          <div className="modal-error" style={{ margin: '0 0 4px' }}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="edit-profile__success">✅ {success}</div>
        )}

        <form className="edit-profile__form" onSubmit={handleSave}>
          <div className="edit-profile__row">
            <div className="edit-profile__field">
              <label className="edit-profile__label">Full Name *</label>
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
            <div className="edit-profile__field">
              <label className="edit-profile__label">Roll Number *</label>
              <select
                id="profile-roll"
                className="input-glass"
                value={form.rollNumber}
                onChange={e => handleChange('rollNumber', e.target.value)}
                required
              >
                <option value="">Select your roll number</option>
                {ROLL_NUMBERS.map(n => (
                  <option key={n} value={n.toString()}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label">Memorable Quote</label>
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
            <label className="edit-profile__label">About Me</label>
            <textarea
              id="profile-bio"
              className="input-glass"
              placeholder="Tell your classmates about yourself..."
              value={form.bio}
              onChange={e => handleChange('bio', e.target.value)}
              rows={4}
              maxLength={500}
            />
            <span className="edit-profile__char-count">{form.bio.length}/500</span>
          </div>

          <button
            id="save-profile-btn"
            type="submit"
            className="btn btn-primary edit-profile__save-btn"
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner" /> {compressing ? 'Compressing photo...' : uploadingPhoto ? 'Uploading photo...' : 'Saving...'}</>
            ) : (
              <><HiOutlineSave /> Save Profile</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
