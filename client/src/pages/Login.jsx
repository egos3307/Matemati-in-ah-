import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loginType, setLoginType] = useState('STUDENT'); // STUDENT, TEACHER
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login({ 
        email, 
        password, 
        studentCode, 
        loginType 
      });
      if (user.role === 'TEACHER') {
        navigate('/ogretmen');
      } else {
        navigate('/ogrenci');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Giriş başarısız. Sunucu bağlantısını kontrol edin.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background-light">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo.png" alt="Fullematematik Logo" className="h-20 w-20 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900">Fullematematiği</h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">Başarıya giden yolda ilk adım</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-2xl rounded-3xl sm:px-10 border border-primary/5">
          
          {/* Login Type Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setLoginType('STUDENT'); setError(''); }}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${loginType === 'STUDENT' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
            >
              Öğrenci Girişi
            </button>
            <button 
              onClick={() => { setLoginType('TEACHER'); setError(''); }}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${loginType === 'TEACHER' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
            >
              Öğretmen Girişi
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {loginType === 'STUDENT' ? (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Öğrenci Kodu</label>
                <input
                  type="text"
                  required
                  placeholder="FMXXX"
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-posta</label>
                <input
                  type="email"
                  required
                  placeholder="burakcelik@fullematematigi.com.tr"
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {loginType !== 'STUDENT' && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Şifre</label>
                <input
                  type="password"
                  required={loginType !== 'STUDENT'}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-5 px-4 bg-primary hover:bg-primary/90 text-white text-lg font-black rounded-2xl shadow-xl shadow-primary/20 transition-all transform active:scale-95"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
