import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Derslerimiz from './pages/Derslerimiz';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';

// Placeholder components for other pages
const About = () => <div className="p-8 text-center mt-20 text-gray-700">Fullematematik, öğrencilerin matematik başarısını artırmak için kurulmuş bir online platformdur.</div>;
const Contact = () => <div className="p-8 text-center mt-20 text-gray-700">Bize ulaşın: info@fullematematigi.com.tr</div>;

const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/ogretmen') || location.pathname.startsWith('/ogrenci');

  return (
    <div className="min-h-screen">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/derslerimiz" element={<Derslerimiz />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostDetail />} />
        <Route path="/iletisim" element={<Contact />} />
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
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
