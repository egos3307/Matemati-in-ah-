import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';
import { trackEvent } from '../utils/analytics';

const CATEGORIES = ['YKS 2027', 'LGS 2027', 'KPSS 2027', 'MAARIF'];

const MAARIF_GRADES = [
  { id: '5. Sınıf', label: '5. Sınıf (Maarif Modeli)', icon: 'school', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: '6. Sınıf', label: '6. Sınıf (Maarif Modeli)', icon: 'school', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: '7. Sınıf', label: '7. Sınıf (Maarif Modeli)', icon: 'school', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: '8. Sınıf', label: '8. Sınıf (Maarif Modeli)', icon: 'school', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: '9. Sınıf', label: '9. Sınıf (Maarif Modeli)', icon: 'auto_stories', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: '10. Sınıf', label: '10. Sınıf (Maarif Modeli)', icon: 'auto_stories', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: '11. Sınıf', label: '11. Sınıf (Alan Seçimli)', icon: 'psychology', color: 'bg-amber-50 text-amber-700 border-amber-200', hasTrack: true }
];

const ALAN_TRACKS_11 = [
  { id: 'Sayısal', label: 'Sayısal (MF)', icon: 'calculate', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Eşit Ağırlık', label: 'Eşit Ağırlık (TM)', icon: 'balance', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Sözel', label: 'Sözel (TS)', icon: 'auto_stories', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Yabancı Dil', label: 'Yabancı Dil (DİL)', icon: 'translate', color: 'bg-amber-50 text-amber-700 border-amber-200' }
];

const TRACK_OPTIONS = {
  'YKS 2027': [
    { id: 'Sayısal', label: 'Sayısal (MF)', icon: 'calculate', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'Eşit Ağırlık', label: 'Eşit Ağırlık (TM)', icon: 'balance', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'Sözel', label: 'Sözel (TS)', icon: 'auto_stories', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'Yabancı Dil', label: 'Yabancı Dil (DİL)', icon: 'translate', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  ],
  'LGS 2027': [
    { id: 'LGS 8. Sınıf', label: '8. Sınıf LGS', icon: 'school', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: '7. Sınıf Hazırlık', label: '7. Sınıf LGS Ön Hazırlık', icon: 'auto_awesome', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ],
  'KPSS 2027': [
    { id: 'Lisans', label: 'KPSS Lisans', icon: 'workspace_premium', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'Ön Lisans', label: 'KPSS Ön Lisans', icon: 'badge', color: 'bg-teal-50 text-teal-700 border-teal-200' }
  ]
};

const QuotaCourseSelection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCat = searchParams.get('kategori') || 'YKS 2027';
  const [selectedCategory, setSelectedCategory] = useState(initialCat);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [step, setStep] = useState(1); // 1: Ders Seçimi, 2: Sınıf/Alan Seçimi, 3: İletişim Bilgileri, 4: Başarılı
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');

  // Form State & Validation
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    setSelectedCategory(initialCat);
    setStep(1);
    setSelectedCourse(null);
    setSelectedGrade('');
    setSelectedTrack('');
  }, [initialCat]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/camps?category=${encodeURIComponent(selectedCategory)}`);
        if (res.data && res.data.length > 0) {
          setCourses(res.data);
        } else {
          const quotaRes = await axios.get(`/api/quota-courses?category=${encodeURIComponent(selectedCategory)}`);
          setCourses(quotaRes.data || []);
        }
      } catch (err) {
        console.error('Error loading quota courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [selectedCategory]);

  const handleCategoryChange = (cat) => {
    setSearchParams({ kategori: cat });
    setSelectedCategory(cat);
    setStep(1);
    setSelectedCourse(null);
    setSelectedGrade('');
    setSelectedTrack('');
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setStep(2);
  };

  // Maarif Modeli Sınıf Seçimi
  const handleMaarifGradeSelect = (gradeObj) => {
    setSelectedGrade(gradeObj.id);
    if (gradeObj.id === '11. Sınıf') {
      // 11. Sınıf seçildiğinde ALAN seçimi gösterilecek
      setSelectedTrack('');
    } else {
      // 9, 10 veya 12. Sınıf seçildiğinde ALAN SEÇİMİ GÖZÜKMEYECEK! Doğrudan 3. adıma geçecek.
      setSelectedTrack(`${gradeObj.id} (Maarif Modeli)`);
      setStep(3);
    }
  };

  const handleTrackSelect = (trackId) => {
    if (selectedCategory === 'MAARIF') {
      setSelectedTrack(`11. Sınıf - ${trackId}`);
    } else {
      setSelectedTrack(trackId);
    }
    setStep(3);
  };

  // Telefon Numarası Temizleme ve Formatlama (Sadece rakam, maks 11 hane)
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length <= 11) {
      setFormData(prev => ({ ...prev, phone: digitsOnly }));
      if (formErrors.phone) {
        setFormErrors(prev => ({ ...prev, phone: '' }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.studentName.trim()) {
      errors.studentName = 'Lütfen adınızı ve soyadınızı girin.';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Telefon numarası zorunludur.';
    } else if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      errors.phone = 'Telefon numarası 10 veya 11 haneli olmalıdır (Örn: 05350000000).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'E-posta adresi zorunludur.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Geçerli bir e-posta adresi girin (Örn: isim@domain.com).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        quotaCourseId: selectedCourse?.id,
        category: selectedCategory,
        courseTitle: selectedCourse?.title,
        track: selectedTrack,
        studentName: formData.studentName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase()
      };

      await axios.post('/api/quota-applications', payload);
      trackEvent('form_submit_success', {
        form_name: 'quota_course_application_form',
        button_location: 'quota_course_page',
        button_text: 'Yeri Ayırt & Öğretmene Gönder'
      });
      setSubmitSuccess(true);
      setStep(4);
    } catch (err) {
      console.error('Application submit error:', err);
      const msg = err.response?.data?.message || 'Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
      setFormErrors(prev => ({ ...prev, global: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title={`${selectedCategory === 'MAARIF' ? 'MAARİF MODELİ' : selectedCategory} Matematik Canlı Ders Kontenjan Kaydı`}
        description={`${selectedCategory} online matematik canlı ders ve geometri kampları için yayınlanmış ders gruplarını seçin ve hemen yerinizi ayırtın.`}
        path={`/kontenjan-dersleri?kategori=${encodeURIComponent(selectedCategory)}`}
        keywords="matematik canlı ders, online matematik canlı ders, canlı matematik dersi kontenjanı, YKS matematik canlı ders, LGS matematik canlı ders"
      />

      <div className="max-w-4xl mx-auto">
        {/* Category Header Switcher */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-sm">how_to_reg</span>
            <span>Kontenjan & Yer Ayırtma Paneli</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {selectedCategory === 'MAARIF' ? 'MAARİF MODELİ' : selectedCategory} <span className="text-primary">Ders Seçimi</span>
          </h1>
          <p className="mt-2 text-slate-600 text-sm font-medium max-w-xl mx-auto">
            Öğretmenimizin yayınladığı derslerden birini seçip bilgilerinizi girerek yerinizi kolayca ayırtabilirsiniz.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-sm ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'MAARIF' ? 'MAARİF MODELİ' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Wizard Progress Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 max-w-2xl mx-auto">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100'}`}>1</span>
              <span className="hidden sm:inline">Ders Seçimi</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>

            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100'}`}>2</span>
              <span className="hidden sm:inline">Seviye / Alan</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`}></div>

            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black ${step >= 3 ? 'bg-primary text-white' : 'bg-slate-100'}`}>3</span>
              <span className="hidden sm:inline">Bilgiler & Onay</span>
            </div>
          </div>
        </div>

        {/* STEP 1: DERS SEÇİMİ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_stories</span>
                <span>Yayınlanan Ders Kartları ({selectedCategory === 'MAARIF' ? 'MAARİF MODELİ' : selectedCategory})</span>
              </h2>
              <span className="text-xs font-bold text-slate-400">Lütfen bir ders seçin</span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                <span>Dersler yükleniyor...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">folder_off</span>
                <p className="text-slate-600 font-bold">Bu kategoride henüz yayınlanmış ders kartı bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase">
                          {course.category === 'MAARIF' ? 'MAARİF MODELİ' : course.category}
                        </span>
                        {course.remainingQuota !== undefined && (
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">local_fire_department</span>
                            <span>Son {course.remainingQuota} Kontenjan</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-base font-black text-slate-900">{course.price || 'Ücret Bilgisi Alın'}</span>
                      <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl shadow-md shadow-primary/20 flex items-center gap-1 transition-all group-hover:scale-105">
                        <span>Yer Ayırt</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SINIF VE ALAN SEÇİMİ */}
        {step === 2 && selectedCourse && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-black text-primary uppercase tracking-widest">2. Adım</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  {selectedCategory === 'MAARIF' ? 'Sınıf Seviyenizi Seçin' : 'Alanınızı Seçin'}
                </h2>
              </div>
              <button
                onClick={() => { setStep(1); setSelectedGrade(''); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Ders Seçimine Dön</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">school</span>
              <div>
                <span className="text-xs font-bold text-slate-400">Seçilen Ders Kartı</span>
                <p className="text-sm font-black text-slate-900">{selectedCourse.title}</p>
              </div>
            </div>

            {/* MAARİF MODELİ ÖZEL AKIŞI */}
            {selectedCategory === 'MAARIF' ? (
              <div className="space-y-6">
                <p className="text-slate-600 text-sm font-medium">
                  Lütfen sınıf seviyenizi seçin:
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {MAARIF_GRADES.map((gr) => (
                    <button
                      key={gr.id}
                      onClick={() => handleMaarifGradeSelect(gr)}
                      className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all hover:scale-102 hover:shadow-md ${
                        selectedGrade === gr.id ? 'bg-primary text-white border-primary shadow-lg' : gr.color
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl">{gr.icon}</span>
                        <div>
                          <h3 className="font-black text-base">{gr.label}</h3>
                          <p className="text-xs opacity-80 font-medium mt-0.5">
                            {gr.id === '11. Sınıf' ? '11. Sınıflar İçin Alan Seçimi Açılır' : 'Doğrudan Başvuruya Geçilir'}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  ))}
                </div>

                {/* YALNIZCA 11. SINIF SEÇİLDİĞİNDE ALAN SEÇİMİ GÖZÜKÜR */}
                {selectedGrade === '11. Sınıf' && (
                  <div className="pt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 font-black text-xs rounded-full">11. Sınıf Özel</span>
                      <h3 className="text-lg font-black text-slate-900">Lütfen Alanınızı Seçin</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {ALAN_TRACKS_11.map((tr) => (
                        <button
                          key={tr.id}
                          onClick={() => handleTrackSelect(tr.id)}
                          className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all hover:scale-102 hover:shadow-md ${tr.color}`}
                        >
                          <span className="material-symbols-outlined text-3xl">{tr.icon}</span>
                          <div>
                            <h3 className="font-black text-base">{tr.label}</h3>
                            <p className="text-xs opacity-80 font-medium mt-0.5">Tıklayarak bu alanı seçin</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* DİĞER KATEGORİLER (YKS, LGS, KPSS) */
              <div className="space-y-6">
                <p className="text-slate-600 text-sm font-medium">
                  Hazırlandığınız alanı veya seviyeyi seçerek ilerleyin:
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(TRACK_OPTIONS[selectedCategory] || TRACK_OPTIONS['YKS 2027']).map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => handleTrackSelect(tr.id)}
                      className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all hover:scale-102 hover:shadow-md ${tr.color}`}
                    >
                      <span className="material-symbols-outlined text-3xl">{tr.icon}</span>
                      <div>
                        <h3 className="font-black text-base">{tr.label}</h3>
                        <p className="text-xs opacity-80 font-medium mt-0.5">Tıklayarak bu alanı seçin</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: İLETİŞİM BİLGİLERİ VE DOĞRULAMA */}
        {step === 3 && selectedCourse && selectedTrack && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-black text-primary uppercase tracking-widest">3. Adım</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Öğrenci İletişim Bilgileri</h2>
              </div>
              <button
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Seviye / Alan Seçimine Dön</span>
              </button>
            </div>

            {/* Özet Kartı */}
            <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Kategori</span>
                <span className="font-black text-slate-900">{selectedCategory === 'MAARIF' ? 'MAARİF MODELİ' : selectedCategory}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Seçilen Ders</span>
                <span className="font-black text-slate-900">{selectedCourse.title}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Seçilen Seviye / Alan</span>
                <span className="font-black text-primary">{selectedTrack}</span>
              </div>
            </div>

            {formErrors.global && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{formErrors.global}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              {/* Ad Soyad */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Öğrenci Adı Soyadı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.studentName}
                  onChange={(e) => {
                    setFormData({ ...formData, studentName: e.target.value });
                    if (formErrors.studentName) setFormErrors({ ...formErrors, studentName: '' });
                  }}
                  className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-slate-900 font-bold outline-none transition-all ${
                    formErrors.studentName ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {formErrors.studentName && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-1">{formErrors.studentName}</p>
                )}
              </div>

              {/* Telefon (Validation: Max 11 digits, numbers only) */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Telefon Numarası * (Sadece Rakam, Maks 11 Hane)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  placeholder="Örn: 05350000000"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-slate-900 font-bold outline-none transition-all ${
                    formErrors.phone ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">
                  Girilen karakter sayısı: {formData.phone.length} / 11
                </p>
                {formErrors.phone && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-1">{formErrors.phone}</p>
                )}
              </div>

              {/* E-posta */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  E-posta Adresi *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Örn: ahmet@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-slate-900 font-bold outline-none transition-all ${
                    formErrors.email ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-1">{formErrors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black text-base rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    <span>Yer Ayırtılıyor...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">event_seat</span>
                    <span>Yeri Ayırt & Öğretmene Gönder</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: BAŞARILI SONUÇ */}
        {step === 4 && submitSuccess && (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">event_seat</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900">Yeriniz Başarıyla Ayırtıldı!</h2>
            <p className="text-slate-600 font-medium text-sm max-w-md mx-auto leading-relaxed">
              Sayın <strong className="text-slate-900">{formData.studentName}</strong>, 
              <span className="text-primary font-bold"> {selectedCategory === 'MAARIF' ? 'MAARİF MODELİ' : selectedCategory} ({selectedCourse?.title} - {selectedTrack})</span> yer ayırtma talebiniz doğrudan öğretmen paneline iletilmiştir.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setSubmitSuccess(false);
                  setSelectedGrade('');
                  setSelectedTrack('');
                  setFormData({ studentName: '', phone: '', email: '' });
                }}
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Başka Bir Ders İçin Yer Ayırt
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all cursor-pointer"
              >
                Anasayfaya Dön
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotaCourseSelection;
