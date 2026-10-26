import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import LandingPage    from './pages/LandingPage';
import YearbookPage   from './pages/YearbookPage';
import ProfilePage    from './pages/ProfilePage';
import GalleryPage    from './pages/GalleryPage';
import WallPage       from './pages/WallPage';
import EventsPage     from './pages/EventsPage';
import ChatPage       from './pages/ChatPage';
import DMPage         from './pages/DMPage';
import EditProfilePage from './pages/EditProfilePage';
import AdminPage      from './pages/AdminPage';

// Chat screens fill the viewport, so they get no footer
const NO_FOOTER = ['/chat', '/dm'];

function AppRoutes() {
  const { pathname, hash } = useLocation();

  // Open each page at the top, like turning to a new page (links to a #section scroll themselves)
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"             element={<LandingPage />} />
        <Route path="/yearbook"     element={<YearbookPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/gallery"      element={<GalleryPage />} />
        <Route path="/wall"         element={<WallPage />} />
        <Route path="/events"       element={<EventsPage />} />

        {/* Protected */}
        <Route path="/chat" element={
          <ProtectedRoute><ChatPage /></ProtectedRoute>
        } />
        <Route path="/dm" element={
          <ProtectedRoute><DMPage /></ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute><EditProfilePage /></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={
          <div className="page-wrapper">
            <div className="page-header">
              <p className="section-label">Page 404</p>
              <h1>This page was torn out</h1>
              <p>The page you're looking for isn't in the yearbook.</p>
            </div>
          </div>
        } />
      </Routes>
      {!NO_FOOTER.includes(pathname) && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
