import React, { useState } from 'react';
import axios from 'axios';
import SEO from '../components/SEO';

const Contact = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await axios.post('/api/contact-messages', {
        name,
        phone,
        email,
        message
      });
      setSuccess('Mesajınız başarıyla iletildi. En kısa sürede sizinle iletişime geçeceğiz.');
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      <SEO
        title="Canlı Matematik Ders Bilgi & İletişim Hattı"
        description="Online matematik canlı ders ve geometri özel ders paketleri hakkında bilgi almak, ücretsiz canlı tanışma dersi oluşturmak için WhatsApp veya telefonla bize ulaşın!"
        path="/iletisim"
        keywords="matematik canlı ders iletişim, online matematik ders kayıt, ücretsiz canlı tanışma dersi başvuru"
      />
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl -z-10 animate-pulse duration-5000"></div>

      {/* Header Banner */}
      <div className="py-16 text-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary mb-4">
            <span className="material-symbols-outlined text-sm font-fill">contact_support</span>
            <span>Bizimle İletişime Geçin</span>
          </span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Sorularınız mı Var? <br />
            <span className="text-primary">Yardımcı Olmaktan Mutluluk Duyarız</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Ders programları, kamplarımız veya üyelikler hakkında bilgi almak için formu doldurabilir ya da doğrudan telefonla ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Card 1: Telefon */}
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-fill">call</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Bizi Arayın</h4>
                <p className="text-xs text-slate-400 font-bold">Hafta içi & Hafta sonu: 09:00 - 22:00</p>
                <div className="pt-2 space-y-1 flex flex-col">
                  <a href="tel:+905350598950" className="text-slate-700 font-bold text-base hover:text-primary transition-colors flex items-center gap-1.5">
                    0535 059 89 50
                  </a>
                  <a href="tel:+905452259635" className="text-slate-700 font-bold text-base hover:text-primary transition-colors flex items-center gap-1.5">
                    0545 225 96 35
                  </a>
                </div>
              </div>
            </div>

            {/* Card 2: E-Posta */}
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-fill">mail</span>
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">E-Posta Gönderin</h4>
                <p className="text-xs text-slate-400 font-bold">Sorularınız için yazabilirsiniz</p>
                <div className="pt-2">
                  <a href="mailto:info@fullematematigi.com.tr" className="text-slate-700 font-bold text-sm hover:text-primary transition-colors break-all">
                    info@fullematematigi.com.tr
                  </a>
                </div>
              </div>
            </div>

            {/* Card 3: Konum */}
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-fill">location_on</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Adres</h4>
                <p className="text-xs text-slate-400 font-bold">Merkez Ofis</p>
                <p className="text-slate-700 font-bold text-sm pt-2 leading-relaxed">
                  Malatya, Yeşilyurt
                </p>
              </div>
            </div>

            {/* Card 4: Instagram */}
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-fill">camera_alt</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Instagram'dan Yazın</h4>
                <p className="text-xs text-slate-400 font-bold">DM yoluyla hızlıca ulaşın</p>
                <div className="pt-2">
                  <a 
                    href="https://instagram.com/fullematematigi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-black text-white hover:opacity-90 shadow-md transition-all duration-300"
                  >
                    @fullematematigi
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl font-fill">send</span>
              Bize Mesaj Gönderin
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Adınız Soyadınız</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Ali Yılmaz"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Telefon Numaranız</label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">E-Posta Adresiniz</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ali@örnek.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Mesajınız</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Sorularınızı veya taleplerinizi buraya yazabilirsiniz..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                ></textarea>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100 font-medium animate-in fade-in duration-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] hover:shadow-xl transition-all text-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Gönderiliyor...' : 'Mesajı İlet'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;
