import React from 'react';
import { Helmet } from 'react-helmet-async';

const KVKK = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>KVKK Aydınlatma Metni – Fullematematiği</title>
        <meta name="description" content="Fullematematiği KVKK Kişisel Verilerin Korunması Kanunu aydınlatma metni ve hukuki belgeler." />
      </Helmet>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 lg:px-10">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">KVKK Aydınlatma Metni</h1>
        <p className="mb-8 text-slate-500">Kişisel Verilerin Korunması Kanunu kapsamındaki hukuki belgelerimiz aşağıda yer almaktadır.</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            src="/fulle_matematigi_hukuki_belgeler.pdf"
            title="KVKK Aydınlatma Metni"
            className="w-full"
            style={{ height: '80vh', minHeight: '600px' }}
          />
        </div>
        <div className="mt-6 text-center">
          <a
            href="/fulle_matematigi_hukuki_belgeler.pdf"
            download
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            PDF İndir
          </a>
        </div>
      </div>
    </div>
  );
};

export default KVKK;
