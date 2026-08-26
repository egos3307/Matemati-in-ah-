import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const StudentRegistrationForm = ({ isModal = false, onClose = null, onSuccess = null }) => {
  const todayStr = new Date().toLocaleDateString('tr-TR');

  const [formData, setFormData] = useState({
    // Öğrenci Bilgileri
    name: '',
    birthDate: '',
    grade: 'LGS',
    schoolName: '',

    // İletişim Bilgileri
    parentName: '',
    studentTel: '',
    parentTel: '',
    email: '',
    address: '',

    // Ders Bilgileri
    serviceProvided: 'LGS', // TYT / AYT / LGS / Özel Konu
    preferredSchedule: '',
    educationType: 'Online', // Online / Yüz yüze
    paymentAmount: '',

    // Ek Bilgiler
    mathLevel: 'Orta', // Başlangıç / Orta / İleri
    goalsNotes: '',

    // Onay ve İzinler
    confirmInfo: false,
    confirmContact: false,
    signatureConfirmed: false,
    formDate: todayStr,

    // İsteğe bağlı şifre
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registeredStudent, setRegisteredStudent] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Lütfen Öğrenci Adı Soyadı alanını doldurunuz.');
      return;
    }
    if (!formData.studentTel.trim() && !formData.parentTel.trim() && !formData.email.trim()) {
      setError('Lütfen en az bir iletişim bilgisi (Telefon numarası veya E-posta) giriniz.');
      return;
    }
    if (!formData.confirmInfo) {
      setError('Lütfen bilgilerin doğruluğunu onaylayan kutucuğu işaretleyiniz.');
      return;
    }
    if (!formData.signatureConfirmed) {
      setError('Lütfen formu tamamlamak için İmza (Onaylıyorum) onayını veriniz.');
      return;
    }

    setLoading(true);

    try {
      // Send registration request
      const endpoint = isModal ? '/api/teacher/add-student' : '/api/register-student';
      const res = await axios.post(endpoint, formData);

      if (res.data) {
        const studentInfo = res.data.student || res.data;
        const tempPass = res.data.initialPassword || formData.password || 'fulle123';
        setRegisteredStudent({ ...studentInfo, tempPass });
        if (onSuccess) onSuccess(studentInfo);
      }
    } catch (err) {
      console.error('Kayıt hatası:', err);
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRegisteredStudent(null);
    setFormData({
      name: '',
      birthDate: '',
      grade: 'LGS',
      schoolName: '',
      parentName: '',
      studentTel: '',
      parentTel: '',
      email: '',
      address: '',
      serviceProvided: 'LGS',
      preferredSchedule: '',
      educationType: 'Online',
      paymentAmount: '',
      mathLevel: 'Orta',
      goalsNotes: '',
      confirmInfo: false,
      confirmContact: false,
      signatureConfirmed: false,
      formDate: todayStr,
      password: ''
    });
  };

  if (registeredStudent) {
    return (
      <div className={`bg-white rounded-3xl ${isModal ? 'p-6' : 'p-8 sm:p-12 shadow-2xl max-w-3xl mx-auto my-8 border border-slate-100'}`}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner animate-bounce">
            🎯
          </div>
          <h2 className="text-3xl font-black text-slate-900">Kayıt Başarıyla Oluşturuldu! 🚀</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            <span className="font-bold text-primary">{registeredStudent.name}</span> isimli öğrencinin kaydı başarıyla tamamlandı. Tüm bilgiler öğretmen panelinde güncellenmiştir.
          </p>

          <div className="bg-slate-900 text-white p-6 rounded-2xl max-w-md mx-auto text-left space-y-3 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs text-slate-400 font-bold">Öğrenci Kodu (Giriş Kodu):</span>
              <span className="text-sm font-black text-amber-400 font-mono">{registeredStudent.studentCode}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs text-slate-400 font-bold">Veli Kodu:</span>
              <span className="text-sm font-black text-amber-400 font-mono">{registeredStudent.parentCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold">İlk Giriş Şifresi:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{registeredStudent.tempPass}</span>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all"
            >
              Yeni Kayıt Oluştur
            </button>
            {!isModal ? (
              <Link
                to="/giris"
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-primary/20"
              >
                Giriş Yap
              </Link>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-primary/20"
              >
                Kapat ve Listeye Dön
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? 'p-2' : 'min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8'}>
      <div className={`max-w-4xl mx-auto bg-white rounded-3xl ${isModal ? 'p-6' : 'p-8 sm:p-12 shadow-2xl border border-slate-100'}`}>
        
        {/* Form Başlığı */}
        <div className="text-center border-b border-slate-100 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4">
            Hedef Başarı 🎯 🚀
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Fullematematik Öğrenci Kayıt Formu
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Lütfen aşağıdaki bilgileri eksiksiz ve doğru şekilde doldurunuz.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500 text-xl">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* 1. ÖĞRENCİ BİLGİLERİ */}
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-lg font-black text-slate-900">Öğrenci Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adı Soyadı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doğum Tarihi
                </label>
                <input
                  type="text"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  placeholder="Örn: 15/04/2010"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sınıf / Düzey <span className="text-rose-500">*</span>
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                >
                  <option value="5">5. Sınıf</option>
                  <option value="6">6. Sınıf</option>
                  <option value="7">7. Sınıf</option>
                  <option value="8">8. Sınıf</option>
                  <option value="LGS">8. Sınıf (LGS)</option>
                  <option value="9">9. Sınıf</option>
                  <option value="10">10. Sınıf</option>
                  <option value="11">11. Sınıf</option>
                  <option value="12">12. Sınıf</option>
                  <option value="TYT">TYT Matematik</option>
                  <option value="AYT">AYT Matematik</option>
                  <option value="Mezun">Mezun (YKS)</option>
                  <option value="KPSS">KPSS Matematik</option>
                  <option value="ALES">ALES / DGS</option>
                  <option value="Özel">Özel Konu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Okul Adı
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="Örn: Atatürk Ortaokulu / Anadolu Lisesi"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>
            </div>
          </div>


          {/* 2. İLETİŞİM BİLGİLERİ */}
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-lg font-black text-slate-900">İletişim Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Veli Adı Soyadı
                </label>
                <input
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="Örn: Mehmet Yılmaz"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefon Numarası <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="studentTel"
                  value={formData.studentTel}
                  onChange={handleChange}
                  placeholder="Örn: 05XX XXX XX XX"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Veli Telefon Numarası
                </label>
                <input
                  type="tel"
                  name="parentTel"
                  value={formData.parentTel}
                  onChange={handleChange}
                  placeholder="Örn: 05XX XXX XX XX"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Örn: ahmet@gmail.com"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adres
                </label>
                <textarea
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Açık ev / okul adresi..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white resize-none"
                ></textarea>
              </div>
            </div>
          </div>


          {/* 3. DERS BİLGİLERİ */}
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-lg font-black text-slate-900">Ders Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ders Seçimi (TYT / AYT / LGS / Özel Konu)
                </label>
                <select
                  name="serviceProvided"
                  value={formData.serviceProvided}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                >
                  <option value="LGS">LGS Hazırlık Matematik</option>
                  <option value="TYT">TYT Matematik</option>
                  <option value="AYT">AYT Matematik</option>
                  <option value="TYT/AYT">TYT + AYT Matematik Kampı</option>
                  <option value="KPSS">KPSS Matematik</option>
                  <option value="Özel Konu">Özel Konu Çalışması</option>
                  <option value="Ortaokul Okul Takviye">Ortaokul Okul Takviye</option>
                  <option value="Lise Okul Takviye">Lise Okul Takviye</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tercih Edilen Gün ve Saat
                </label>
                <input
                  type="text"
                  name="preferredSchedule"
                  value={formData.preferredSchedule}
                  onChange={handleChange}
                  placeholder="Örn: Hafta içi akşam 18:00 sonrası / Cumartesi"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Eğitim Türü (Online / Yüz yüze)
                </label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="educationType"
                      value="Online"
                      checked={formData.educationType === 'Online'}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary"
                    />
                    Online Canlı Ders (Zoom)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="educationType"
                      value="Yüz yüze"
                      checked={formData.educationType === 'Yüz yüze'}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary"
                    />
                    Yüz yüze Özel Ders
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ders Ücreti
                </label>
                <input
                  type="text"
                  name="paymentAmount"
                  value={formData.paymentAmount}
                  onChange={handleChange}
                  placeholder="Örn: 2.500 TL / Aylık veya Ders başı"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white"
                />
              </div>
            </div>
          </div>


          {/* 4. EK BİLGİLER */}
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-lg font-black text-slate-900">Ek Bilgiler</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Matematik Seviyesi
                </label>
                <div className="flex flex-wrap gap-4">
                  {['Başlangıç', 'Orta', 'İleri'].map((lvl) => (
                    <label key={lvl} className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-primary transition-all">
                      <input
                        type="radio"
                        name="mathLevel"
                        value={lvl}
                        checked={formData.mathLevel === lvl}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary"
                      />
                      {lvl} Seviye
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hedefler / Not Edilecek Özel Durumlar
                </label>
                <textarea
                  name="goalsNotes"
                  rows="3"
                  value={formData.goalsNotes}
                  onChange={handleChange}
                  placeholder="Öğrencinin hedeflediği lise/üniversite, eksik olduğu özel konular veya dikkat edilmesi gereken durumlar..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium bg-white resize-none"
                ></textarea>
              </div>
            </div>
          </div>


          {/* 5. ONAY VE İZİNLER */}
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="text-lg font-black text-slate-900">Onay ve İzinler</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all">
                <input
                  type="checkbox"
                  name="confirmInfo"
                  checked={formData.confirmInfo}
                  onChange={handleChange}
                  required
                  className="mt-1 w-5 h-5 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-slate-800">
                  Formda verilen bilgilerin doğruluğunu onaylıyorum. <span className="text-rose-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all">
                <input
                  type="checkbox"
                  name="confirmContact"
                  checked={formData.confirmContact}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-slate-800">
                  Fulle Matematiği’nin bilgilendirme ve ders ile ilgili iletişim göndermesini kabul ediyorum.
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl">
                  <input
                    type="checkbox"
                    name="signatureConfirmed"
                    checked={formData.signatureConfirmed}
                    onChange={handleChange}
                    required
                    className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-black text-amber-900">
                    İmza: (Onaylıyorum) <span className="text-rose-500">*</span>
                  </span>
                </label>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Form Tarihi
                  </label>
                  <input
                    type="text"
                    name="formDate"
                    value={formData.formDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Gönder Butonu */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all"
              >
                Vazgeç
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Kayıt Yapılıyor...
                </>
              ) : (
                <>
                  <span>Öğrenci Kaydını Tamamla</span>
                  <span className="text-xl">🚀</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationForm;
