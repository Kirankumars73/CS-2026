import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';
import ShapeLandingHero from '../components/ui/shape-landing-hero';
import './LandingPage.css';

export default function LandingPage() {
  const { currentUser } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Animated floating shapes background */}
      <ShapeLandingHero />

      {/* Content */}
      <div className="landing__content">
        {/* Badge */}
        <div className="landing__badge">
          <span className="badge-dot"></span>
          Class of 2022–26 · 67 Classmates
        </div>

        {/* Hero text */}
        <h1 className="landing__title">
          <span className="landing__title-line">Our Story,</span>
          <span className="landing__title-line landing__title-line--gold">Our Legacy,</span>
          <span className="landing__title-line landing__title-line--dim">Forever Remembered</span>
        </h1>

        <p className="landing__description">
          A digital yearbook celebrating four years of friendship, growth, and unforgettable memories.
          Browse profiles, relive events, and leave your mark on the wall.
        </p>

        {/* Stat bar */}
        <div className="landing__stats">
          <div className="stat-item">
            <span className="stat-value">67</span>
            <span className="stat-label">Classmates</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">4</span>
            <span className="stat-label">Years</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">1</span>
            <span className="stat-label">Family</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="landing__ctas">
          <button
            id="view-yearbook-btn"
            className="btn btn-primary landing__btn"
            onClick={() => navigate('/yearbook')}
          >
            View Yearbook →
          </button>
          {currentUser ? (
            <button
              id="go-to-edit-btn"
              className="btn btn-glass landing__btn"
              onClick={() => navigate('/edit-profile')}
            >
              ✏️ My Profile
            </button>
          ) : (
            <button
              id="landing-login-btn"
              className="btn btn-glass landing__btn"
              onClick={() => setShowLogin(true)}
            >
              🔑 Login to Edit
            </button>
          )}
        </div>

        {/* Scroll hint */}
        <div className="landing__scroll-hint">
          <div className="scroll-line"></div>
          <span>Explore below</span>
          <div className="scroll-line"></div>
        </div>
      </div>

      {/* Feature cards row */}
      <div className="landing__features">
        {[
          { icon: '📸', title: 'Gallery', desc: 'Memories captured forever', link: '/gallery' },
          { icon: '📝', title: 'Wall', desc: 'Leave your message', link: '/wall' },
          { icon: '🎉', title: 'Events', desc: 'Our best moments together', link: '/events' },
          { icon: '💬', title: 'Chat', desc: 'Connect with batchmates', link: '/chat' },
        ].map(f => (
          <button key={f.title} className="feature-card glass-card" onClick={() => navigate(f.link)}>
            <span className="feature-icon">{f.icon}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </button>
        ))}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
