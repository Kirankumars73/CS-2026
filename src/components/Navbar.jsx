import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineLogout, HiMenu, HiX } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, isAdmin, logout, memberProfile, redirectSignIn, clearRedirectSignIn } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 20);
  const navigate = useNavigate();
  const { pathname } = useLocation();

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

  // Transparent, white-on-navy while it sits over the landing page cover
  const onCover = pathname === '/' && !scrolled && !menuOpen;

  const avatar = memberProfile?.profilePhotoImageKit || memberProfile?.profilePhoto || currentUser?.photoURL;
  const initials = (memberProfile?.name || currentUser?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <nav className={`navbar ${onCover ? 'navbar--cover' : ''}`}>
        <div className="navbar__inner">
          <Link to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
            <span className="navbar__logo-mark">CS’26</span>
            <span className="navbar__logo-text">Yearbook</span>
          </Link>

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

          <div className="navbar__actions">
            <ThemeToggle className="navbar__icon-btn" />
            {currentUser ? (
              <>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `navbar__admin-link ${isActive ? 'active' : ''}`}
                  >
                    Admin
                  </NavLink>
                )}
                <Link to={`/profile/${currentUser.uid}`} className="navbar__avatar-wrap" title="My yearbook page">
                  {avatar ? (
                    <img src={avatar} alt={initials} className="navbar__avatar" />
                  ) : (
                    <div className="navbar__avatar-placeholder">{initials}</div>
                  )}
                </Link>
                <button className="navbar__icon-btn" onClick={handleLogout} title="Log out" aria-label="Log out">
                  <HiOutlineLogout />
                </button>
              </>
            ) : (
              <button
                id="navbar-login-btn"
                className="btn btn-primary btn-sm navbar__login"
                onClick={() => setShowLogin(true)}
              >
                Log in
              </button>
            )}

            <button
              className="navbar__burger"
              onClick={() => setMenuOpen(m => !m)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <HiX /> : <HiMenu />}
            </button>
          </div>
        </div>

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
                    Admin panel
                  </NavLink>
                )}
                <NavLink to="/edit-profile" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Edit my profile
                </NavLink>
                <button className="navbar__mobile-link navbar__mobile-logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <button
                className="navbar__mobile-link"
                onClick={() => { setMenuOpen(false); setShowLogin(true); }}
              >
                Log in
              </button>
            )}
          </div>
        )}
      </nav>

      {(showLogin || redirectSignIn) && (
        <LoginModal onClose={() => { setShowLogin(false); clearRedirectSignIn(); }} />
      )}
    </>
  );
}
