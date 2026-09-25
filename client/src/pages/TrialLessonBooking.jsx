import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';
import { trackEvent } from '../utils/analytics';
import { getDynamicWhatsAppLink } from '../utils/whatsapp';
import { captureUtmParams, appendUtmToUrl } from '../utils/utm';

const FALLBACK_CAMPS = [
  {
    id: 'lgs-camp',
    category: 'LGS 2027',
    badge: 'LGS 8. Sınıf & Ortaokul',
    title: 'Ortaokul Yeni Nesil Soru Çözüm Kampı',
    subtitle: 'LGS ve Okul Sınavları İçin Sağlam Altyapı',
    description: '18 Canlı ders, 7/24 kayıt erişimi, çözümlü ders notları ve birebir takip.',
    price: '2.500 TL',
    image: '/IMG_3001.jpeg'
  },
  {
    id: 'kpss-camp',
    category: 'KPSS 2027',
    badge: 'Lisans & Ön Lisans',
    title: 'KPSS Lisans & Ön Lisans Matematik Kampı',
    subtitle: 'Matematikte Eksiklerini Kapat, Netlerini Zirveye Taşı!',
    description: '54 Canlı ders, 35+ çözümlü PDF soru havuzu, tüm çıkmış soruların detaylı çözümleri.',
    price: '3.500 TL',
    image: '/IMG_2999.jpeg'
  },
  {
    id: 'yks-camp',
    category: 'YKS 2027',
    badge: 'TYT / AYT Adayları',
    title: 'YKS Matematik Derece Canlı Ders Paketleri',
    subtitle: 'TYT & AYT Konu Anlatımı ve Yeni Nesil Soru Çözüm Grubu',
    description: 'Birebir seviye analizi, haftalık canlı dersler, kişiye özel koçluk takibi.',
    price: '3.500 TL',
    image: '/logo.png'
  }
];

const GRADE_OPTIONS = [
  'LGS 8. Sınıf',
  'YKS TYT / AYT (12. Sınıf & Mezun)',
  '11. Sınıf Matematik',
  '10. Sınıf Matematik',
  '9. Sınıf Matematik',
  '7. Sınıf LGS Ön Hazırlık',
  '6. Sınıf Matematik',
  '5. Sınıf Matematik',
  'KPSS Lisans / Ön Lisans'
];

const TrialLessonBooking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('kategori') || searchParams.get('category') || '';
  const refParam = searchParams.get('ref') || 'direct';

  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    grade: 'YKS TYT / AYT (12. Sınıf & Mezun)',
    preferredSchedule: 'Haftaiçi Akşam (18:00 - 21:00)',
    notes: '',
    parentName: '',
    parentTel: ''
  });

  const [matchedCamp, setMatchedCamp] = useState(FALLBACK_CAMPS[2]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    captureUtmParams();

    // Determine default grade and camp match based on URL parameters
    const catLower = categoryParam.toLowerCase();
    if (catLower.includes('lgs') || catLower.includes('8.') || catLower.includes('ortaokul')) {
      setFormData(prev => ({ ...prev, grade: 'LGS 8. Sınıf' }));
      setMatchedCamp(FALLBACK_CAMPS[0]);
    } else if (catLower.includes('kpss') || catLower.includes('lisans') || catLower.includes('ön lisans')) {
      setFormData(prev => ({ ...prev, grade: 'KPSS Lisans / Ön Lisans' }));
      setMatchedCamp(FALLBACK_CAMPS[1]);
    } else if (catLower.includes('9.')) {
      setFormData(prev => ({ ...prev, grade: '9. Sınıf Matematik' }));
      setMatchedCamp(FALLBACK_CAMPS[2]);
    } else if (catLower.includes('10.')) {
      setFormData(prev => ({ ...prev, grade: '10. Sınıf Matematik' }));
      setMatchedCamp(FALLBACK_CAMPS[2]);
    } else if (catLower.includes('11.')) {
      setFormData(prev => ({ ...prev, grade: '11. Sınıf Matematik' }));
      setMatchedCamp(FALLBACK_CAMPS[2]);
    } else {
      setMatchedCamp(FALLBACK_CAMPS[2]);
    }

    // Try fetching live active camps from API
    axios.get('/api/camps').then(res => {
      if (res.data && res.data.length > 0) {
        const camps = res.data;
        if (catLower.includes('lgs')) {
          const matched = camps.find(c => (c.title || c.badge || '').toLowerCase().includes('lgs') || (c.title || '').toLowerCase().includes('ortaokul'));
          if (matched) setMatchedCamp(matched);
        } else if (catLower.includes('kpss')) {
          const matched = camps.find(c => (c.title || c.badge || '').toLowerCase().includes('kpss'));
          if (matched) setMatchedCamp(matched);
        } else {
          const matched = camps.find(c => (c.title || c.badge || '').toLowerCase().includes('yks') || (c.title || '').toLowerCase().includes('tyt'));
          if (matched) setMatchedCamp(matched);
        }
      }
    }).catch(() => {});
  }, [categoryParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.studentName.trim()) {
      setErrorMsg('Lütfen Öğrenci Adı Soyadı alanını doldurunuz.');
      return;
    }

    if (!formData.phone.trim()) {
      setErrorMsg('Lütfen iletişim için Telefon Numarası giriniz.');
      return;
    }

    setSubmitting(true);

    try {
      // Send payload to backend trial requests endpoint
      const payload = {
        type: 'TRIAL_LESSON',
        studentName: formData.studentName.trim(),
        email: formData.email.trim() || `${Date.now()}@matematikinsahi.com`,
        phone: formData.phone.trim(),
        grade: formData.grade,
        preferredSchedule: formData.preferredSchedule,
        notes: `[Kamp: ${matchedCamp.title}] ${formData.notes}`.trim()
      };

      const res = await axios.post('/api/trial-requests', payload);

      trackEvent('form_submit_success', {
        form_name: 'free_trial_booking_form',
        button_location: 'trial_lesson_page',
        button_text: 'Ücretsiz Dersimi Planla'
      });

      trackEvent('purchase', {
        transaction_id: res.data?.id || `TL_${Date.now()}`,
        value: 0,
        currency: 'TRY',
        category: formData.grade,
        course_title: matchedCamp.title,
        source: refParam
      });

      setSubmitSuccess(true);
    } catch (err) {
      console.error('Trial booking error:', err);
      setErrorMsg(err.response?.data?.error || 'Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setSubmitting(false);
    }
  };

  const waSuccessUrl = getDynamicWhatsAppLink(
    formData.grade,
    `Merhaba, ben ${formData.studentName}. ${formData.grade} için ücretsiz canlı tanışma dersi randevusu oluşturdum. Detayları görüşmek istiyorum.`
  );

  return (
    <main className="min-h-screen bg-slate-50/60 pb-20 pt-8">
      <SEO
        title="Ücretsiz Canlı Tanışma Dersi Planla | Matematiğin Şahı"
        description="Matematiğin Şahı uzman kadrosuyla 15 dakikalık ücretsiz canlı tanışma dersine katılın. Seviyenizi belirleyelim ve hedefinize özel matematik çalışma haritanızı çıkaralım."
        path="/ucretsiz-tanisma-dersi"
        keywords="ücretsiz matematik dersi, ücretsiz tanışma dersi, canlı matematik deneme dersi, online matematik özel ders randevu"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-extrabold text-primary uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">school</span>
            <span>%100 Canlı & Ücretsiz Tanışma Dersi</span>
          </span>
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl leading-tight">
            Matematik Seviyeni Belirleyelim, <br className="hidden sm:inline" />
            <span className="text-primary">Sana Özel Planı Hazırlayalım!</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Uzman öğretmenimizle birebir Zoom tanışma dersinde eksiklerini tespit edelim ve hedeflerine tam uygun eğitim yol haritanı ücretsiz oluşturalım.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form / Success state */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-md">
            {submitSuccess ? (
              <div className="text-center py-8 space-y-6 animate-fade-in">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900">Randevunuz Başarıyla Alındı!</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                    Talebiniz eğitim rehberlerimize iletildi. En kısa sürede telefon veya WhatsApp üzerinden sizinle iletişime geçeceğiz.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={waSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    <span>WhatsApp'tan Anında Yazın</span>
                  </a>

                  <Link
                    to="/derslerimiz"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-6 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    <span>Canlı Dersleri İncele</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">event_note</span>
                  <span>Tanışma Dersi Kayıt Formu</span>
                </h3>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Öğrenci Adı Soyadı *</label>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleChange}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Telefon / WhatsApp *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="05XX XXX XX XX"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">E-posta (İsteğe Bağlı)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ornek@gmail.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Sınıf veya Hedef Sınav</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                    >
                      {GRADE_OPTIONS.map((g, idx) => (
                        <option key={idx} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Tercih Edilen Saat Aralığı</label>
                    <select
                      name="preferredSchedule"
                      value={formData.preferredSchedule}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                    >
                      <option value="Haftaiçi Akşam (18:00 - 21:00)">Haftaiçi Akşam (18:00 - 21:00)</option>
                      <option value="Haftaiçi Gündüz (10:00 - 17:00)">Haftaiçi Gündüz (10:00 - 17:00)</option>
                      <option value="Hafta Sonu Cumartesi / Pazar">Hafta Sonu Cumartesi / Pazar</option>
                      <option value="Fark etmez / En Yakın Saat">Fark etmez / En Yakın Saat</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Matematikte Zorlanılan Konular veya Notlar</label>
                  <textarea
                    name="notes"
                    rows="3"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Örn: Problemler konusunda zorlanıyorum, netlerimi artırmak istiyorum..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/30 hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>Planlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Ücretsiz Canlı Dersimi Planla 🚀</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Recommended Active Camp Card & Trust Proof */}
          <div className="lg:col-span-5 space-y-6">
            {/* Recommended Product Box */}
            <div className="bg-white rounded-3xl border border-primary/20 p-6 shadow-md overflow-hidden relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Sana Özel Tavsiye Eğitim Kampı
                </span>
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 relative">
                <img
                  src={matchedCamp.image}
                  alt={matchedCamp.title}
                  className="w-full h-full object-cover"
                />
                {matchedCamp.price && (
                  <span className="absolute top-3 right-3 rounded-full bg-white/95 backdrop-blur-xs px-3 py-1 text-xs font-black text-primary shadow-xs">
                    {matchedCamp.price}
                  </span>
                )}
              </div>

              <h4 className="text-lg font-bold text-slate-900 leading-snug">
                {matchedCamp.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {matchedCamp.subtitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                {matchedCamp.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-400">Canlı Ders Kamp Formatı</span>
                <span className="text-xs font-black text-primary">Zoom + 7/24 Kayıt</span>
              </div>
            </div>

            {/* Trust Highlights */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
              <h4 className="text-sm font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">verified</span>
                <span>Neden Matematiğin Şahı Tanışma Dersi?</span>
              </h4>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
                  <span><strong>%100 Ücretsiz & Ücretsiz:</strong> Randevunuz için hiçbir ücret ödemezsiniz.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
                  <span><strong>Seviye & Eksik Analizi:</strong> Mevcut netleriniz ve eksik konularınız anında belirlenir.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
                  <span><strong>Birebir Öğretmen Desteği:</strong> Sorularınızı doğrudan eğitmenlerimize iletebilirsiniz.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TrialLessonBooking;
