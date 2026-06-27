import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import Derslerimiz from './pages/Derslerimiz';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import Contact from './pages/Contact';

import WatchRecording from './pages/WatchRecording';
import KVKK from './pages/KVKK';

// Placeholder components for other pages
const About = () => <div className="p-8 text-center mt-20 text-gray-700">Fullematematik, öğrencilerin matematik başarısını artırmak için kurulmuş bir online platformdur.</div>;

const WhatsAppButton = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/ogretmen') || location.pathname.startsWith('/ogrenci') || location.pathname.startsWith('/veli');

  if (user || isDashboard) return null;

  return (
    <a
      href="https://wa.me/905350598950?text=Merhaba,%20Fullematematik%20hakkında%20bilgi%20almak%20istiyorum."
      target="_blank"
      rel="noopener noreferrer"
      title="WhatsApp'tan ulaşın"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#25D366',
        borderRadius: '50%',
        width: '60px',
        height: '60px',
        boxShadow: '0 4px 20px rgba(37,211,102,0.40)',
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.12)';
        e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,211,102,0.55)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,0.40)';
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.832 6.5L4 29l7.697-1.813A12.94 12.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="white"/>
        <path d="M21.537 18.93c-.306-.153-1.81-.893-2.09-.996-.28-.102-.484-.153-.688.153-.204.306-.79.996-.97 1.2-.178.204-.357.23-.663.077-.306-.154-1.29-.476-2.456-1.515-.908-.81-1.52-1.81-1.698-2.116-.178-.306-.019-.471.134-.624.137-.136.306-.357.459-.535.153-.178.204-.306.306-.51.102-.204.051-.382-.026-.535-.077-.153-.688-1.66-.943-2.272-.249-.597-.5-.516-.688-.526l-.587-.01c-.204 0-.535.077-.815.382-.28.306-1.07 1.046-1.07 2.55 0 1.505 1.096 2.96 1.249 3.163.153.204 2.155 3.29 5.223 4.614.73.315 1.3.503 1.744.644.733.233 1.4.2 1.927.122.588-.088 1.81-.74 2.065-1.455.255-.714.255-1.326.178-1.455-.076-.128-.28-.204-.587-.357z" fill="#25D366"/>
      </svg>
    </a>
  );
};

const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/ogretmen') || location.pathname.startsWith('/ogrenci') || location.pathname.startsWith('/veli');

  return (
    <div className="min-h-screen">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/derslerimiz" element={<Derslerimiz />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostDetail />} />
        <Route path="/iletisim" element={<Contact />} />
        <Route path="/kvkk" element={<KVKK />} />
        <Route path="/giris" element={<Login />} />
        <Route 
          path="/ogretmen" 
          element={
            <ProtectedRoute role="TEACHER">
              <TeacherDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ogrenci" 
          element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ogrenci/kayit-izle" 
          element={
            <ProtectedRoute role="STUDENT">
              <WatchRecording />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/veli" 
          element={
            <ProtectedRoute role="PARENT">
              <ParentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/veli/kayit-izle" 
          element={
            <ProtectedRoute role="PARENT">
              <WatchRecording />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <WhatsAppButton />
    </div>
  );
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;

