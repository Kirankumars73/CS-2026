import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HiOutlinePencil, HiOutlineLogout, HiOutlineLightningBolt, HiMenu, HiX } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, isAdmin, logout, memberProfile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/yearbook', label: 'Yearbook' },
    { to: '/gallery',  label: 'Gallery'  },
    { to: '/wall',     label: 'Wall'     },
    { to: '/events',   label: 'Events'   },
    { to: '/chat',     label: 'Chat'     },
    { to: '/dm',       label: 'DMs'      },
  ];

  const avatar = memberProfile?.profilePhoto || currentUser?.photoURL;
  const initials = (memberProfile?.name || currentUser?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          {/* Logo */}
          <Link to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
            <span className="navbar__logo-icon">◈</span>
            <span className="navbar__logo-text">CS <span className="navbar__logo-year">2026</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="navbar__links">
            {navLinks.map(link => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="navbar__actions">
            {currentUser ? (
              <>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `navbar__admin-link ${isActive ? 'active' : ''}`}
                    title="Admin Panel"
                  >
                    <HiOutlineLightningBolt />
                    <span>Admin</span>
                  </NavLink>
                )}
                <Link to="/edit-profile" className="navbar__icon-btn" title="Edit Profile">
                  <HiOutlinePencil />
                </Link>
                <div className="navbar__avatar-wrap" onClick={handleLogout} title="Logout">
                  {avatar ? (
                    <img src={avatar} alt={initials} className="navbar__avatar" />
                  ) : (
                    <div className="navbar__avatar-placeholder">{initials}</div>
                  )}
                  <HiOutlineLogout className="navbar__logout-icon" />
                </div>
              </>
            ) : (
              <button
                id="navbar-login-btn"
                className="btn btn-primary btn-sm"
                onClick={() => setShowLogin(true)}
              >
                Login
              </button>
            )}

            {/* Mobile burger */}
            <button
              className="navbar__burger"
              onClick={() => setMenuOpen(m => !m)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <HiX /> : <HiMenu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="navbar__mobile-menu">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `navbar__mobile-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {currentUser ? (
              <>
                {isAdmin && (
                  <NavLink to="/admin" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    ⚡ Admin Panel
                  </NavLink>
                )}
                <NavLink to="/edit-profile" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  ✏️ Edit Profile
                </NavLink>
                <button className="navbar__mobile-link navbar__mobile-logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </>
            ) : (
              <button
                className="navbar__mobile-link"
                onClick={() => { setMenuOpen(false); setShowLogin(true); }}
              >
                🔑 Login to Edit
              </button>
            )}
          </div>
        )}
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
