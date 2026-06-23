import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ZoomMeeting = ({ meetingNumber, meetingPassword, role, userName, userEmail, onClose }) => {
  const [status, setStatus] = useState('Zoom SDK kütüphanesi yükleniyor...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Zoom DOM elements check
    // Zoom Web SDK needs #zmmtg-root container in the DOM to render itself.
    let zoomRoot = document.getElementById('zmmtg-root');
    if (!zoomRoot) {
      zoomRoot = document.createElement('div');
      zoomRoot.id = 'zmmtg-root';
      zoomRoot.className = 'zoom-meeting-root';
      document.body.appendChild(zoomRoot);
    }
    
    // Hide the React app main root so Zoom takes full viewport cleanly
    const mainRoot = document.getElementById('root');
    if (mainRoot) {
      mainRoot.style.display = 'none';
    }

    // 2. Load Zoom CDN scripts dynamically
    const loadZoomScripts = () => {
      return new Promise((resolve, reject) => {
        if (window.ZoomMtg) {
          resolve(window.ZoomMtg);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://source.zoom.us/zoom-meeting-3.11.0.min.js';
        script.async = true;
        script.onload = () => {
          if (window.ZoomMtg) {
            resolve(window.ZoomMtg);
          } else {
            reject(new Error('ZoomMtg object not found on window'));
          }
        };
        script.onerror = () => reject(new Error('Zoom SDK script load failed'));
        document.head.appendChild(script);
      });
    };

    const startZoomMeeting = async () => {
      try {
        setStatus('Zoom SDK yükleniyor...');
        const ZoomMtg = await loadZoomScripts();

        setStatus('Zoom SDK konfigüre ediliyor...');
        ZoomMtg.setZoomJSLib('https://source.zoom.us/3.11.0/lib', '/av');
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        setStatus('Toplantı imzası alınıyor...');
        const signatureRes = await axios.post('/api/zoom/signature', {
          meetingNumber: meetingNumber,
          role: role // 'TEACHER' or 'STUDENT'
        });

        const { signature, sdkKey } = signatureRes.data;

        setStatus('Derse bağlanılıyor...');
        ZoomMtg.init({
          leaveUrl: window.location.origin,
          patchJsMedia: true,
          success: () => {
            ZoomMtg.join({
              meetingNumber: meetingNumber,
              userName: userName || 'Fullematematik Öğrencisi',
              signature: signature,
              sdkKey: sdkKey,
              passWord: meetingPassword || '',
              userEmail: userEmail || 'info@fullematematik.com',
              success: (success) => {
                console.log('Joined zoom meeting successfully:', success);
                setLoading(false);
              },
              error: (err) => {
                console.error('Zoom join error:', err);
                setStatus(`Derse katılım hatası: ${err.errorMessage || 'Bağlantı kurulamadı'}`);
              }
            });
          },
          error: (err) => {
            console.error('Zoom init error:', err);
            setStatus(`SDK başlatılamadı: ${err.errorMessage || 'Sistem hatası'}`);
          }
        });

      } catch (err) {
        console.error('Zoom meeting integration failed:', err);
        setStatus(`Bağlantı hatası: ${err.response?.data?.error || err.message}`);
      }
    };

    startZoomMeeting();

    // 3. Cleanup Zoom variables on component unmount
    return () => {
      // Restore React main viewport visible
      if (mainRoot) {
        mainRoot.style.display = 'block';
      }
      
      // Clean up Zoom DOM roots
      if (zoomRoot) {
        zoomRoot.remove();
      }
      
      // If Zoom was initialized, call leave
      if (window.ZoomMtg) {
        try {
          window.ZoomMtg.leaveMeeting();
        } catch (e) {
          // ignore if already closed
        }
      }
    };
  }, [meetingNumber, meetingPassword, role, userName, userEmail]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-[99999] p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary animate-pulse">
            <span className="material-symbols-outlined text-4xl">video_chat</span>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black mb-2">Canlı Ders Bağlantısı</h3>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">{status}</p>
        </div>
        <div className="pt-4 flex justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors text-xs font-black rounded-xl uppercase tracking-wider border border-white/5"
          >
            Bağlantıyı İptal Et
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZoomMeeting;
