import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

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

function AppRoutes() {
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
          <div className="page-wrapper" style={{ textAlign: 'center', paddingTop: 140 }}>
            <h1 style={{ fontSize: '4rem', marginBottom: 16 }}>404</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
          </div>
        } />
      </Routes>
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
