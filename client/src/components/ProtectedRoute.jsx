import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-500 font-bold text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/giris" replace />;
  }

  // HEAD_TEACHER de TEACHER sayfasına girebilir
  const effectiveRole = user.role === 'HEAD_TEACHER' ? 'TEACHER' : user.role;

  if (role && effectiveRole !== role) {
    // Kullanıcıyı kendi paneline yönlendir
    if (user.role === 'TEACHER' || user.role === 'HEAD_TEACHER') return <Navigate to="/ogretmen" replace />;
    if (user.role === 'PARENT') return <Navigate to="/veli" replace />;
    return <Navigate to="/ogrenci" replace />;
  }

  return children;
};

export default ProtectedRoute;
