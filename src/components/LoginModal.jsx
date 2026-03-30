import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { HiX, HiLockClosed, HiArrowRight } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import './LoginModal.css';

export default function LoginModal({ onClose }) {
  const { loginWithGoogle, verifyAndJoin } = useAuth();
  const [step, setStep] = useState(1); // 1 = google, 2 = secret code
  const [secretCode, setSecretCode] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const codeInputRef = useRef(null);

  // Focus code input when on step 2
  useEffect(() => {
    if (step === 2 && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loginWithGoogle();
      setTempUser(user);
      setStep(2);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!secretCode.trim()) {
      setError('Please enter the class secret code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { isNewMember } = await verifyAndJoin(tempUser, secretCode);
      onClose();
      if (isNewMember) {
        navigate('/edit-profile');
      } else {
        navigate('/yearbook');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="login-modal">
        {/* Close button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <HiX />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-logo">◈</div>
          <h2 className="modal-title">Welcome to CS 2026</h2>
          <p className="modal-subtitle">
            {step === 1
              ? 'Sign in with your Google account to join the yearbook'
              : 'Enter the class secret code to verify your membership'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="modal-steps">
          <div className={`modal-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span className="step-dot">1</span>
            <span className="step-label">Google Sign-In</span>
          </div>
          <div className="step-line"></div>
          <div className={`modal-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-dot">2</span>
            <span className="step-label">Secret Code</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="modal-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Step 1: Google Sign-In */}
        {step === 1 && (
          <div className="modal-body">
            <button
              id="google-signin-btn"
              className="google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <FcGoogle className="google-icon" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            <p className="modal-note">
              Only Google accounts linked to Class CS 2026 can access editing features.
            </p>
          </div>
        )}

        {/* Step 2: Secret Code */}
        {step === 2 && (
          <form className="modal-body" onSubmit={handleVerify}>
            {tempUser && (
              <div className="modal-user-info">
                <img src={tempUser.photoURL} alt="" className="modal-user-avatar" />
                <div>
                  <div className="modal-user-name">{tempUser.displayName}</div>
                  <div className="modal-user-email">{tempUser.email}</div>
                </div>
              </div>
            )}
            <label className="modal-label">
              <HiLockClosed className="label-icon" />
              Class Secret Code
            </label>
            <input
              ref={codeInputRef}
              id="secret-code-input"
              type="password"
              className="input-glass"
              placeholder="Enter secret code..."
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              disabled={loading}
            />
            <button
              id="verify-code-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : (
                <>Verify & Join <HiArrowRight /></>
              )}
            </button>
            <button
              type="button"
              className="modal-back-btn"
              onClick={() => { setStep(1); setSecretCode(''); setError(''); setTempUser(null); }}
              disabled={loading}
            >
              ← Use a different account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
