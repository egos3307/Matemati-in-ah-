import React, { useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';

const LiveMeeting = ({ lessonId, role, userName, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('Kamera ve mikrofon hazırlanıyor...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const screenStreamRef = useRef(null);

  const targetPeerId = `fulle_${lessonId}_${role === 'TEACHER' ? 'student' : 'teacher'}`;

  useEffect(() => {
    let streamInstance = null;
    let peerInstance = null;
    let callRetryInterval = null;
    let retryTimeout = null;

    const startMeeting = async () => {
      try {
        // 1. Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamInstance = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Initialize PeerJS connection helper
        const initPeer = () => {
          if (peerInstance) {
            peerInstance.destroy();
          }

          // Randomize student ID, keep teacher ID fixed so student can call
          const myPeerId = role === 'TEACHER' 
            ? `fulle_${lessonId}_teacher` 
            : `fulle_${lessonId}_student_${Math.random().toString(36).substring(2, 7)}`;

          const peer = new Peer(myPeerId, {
            host: '0.peerjs.com',
            secure: true,
            port: 443
          });
          peerInstance = peer;
          peerRef.current = peer;

          peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setStatus('Bağlantı kuruldu. Karşı taraf bekleniyor...');
            
            if (role === 'STUDENT') {
              attemptCall(peer, stream);
            }
          });

          peer.on('call', (incomingCall) => {
            console.log('Receiving call from: ' + incomingCall.peer);
            setStatus('Ders başladı.');
            callRef.current = incomingCall;
            
            incomingCall.answer(stream);
            incomingCall.on('stream', (rStream) => {
              setRemoteStream(rStream);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = rStream;
              }
            });

            incomingCall.on('close', () => {
              setRemoteStream(null);
              setStatus('Karşı taraf dersten ayrıldı.');
            });
          });

          peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
              setStatus('Öğretmen henüz derse katılmadı...');
            } else if (err.type === 'unavailable-id') {
              setStatus('Önceki bağlantı temizleniyor, 2 saniye içinde tekrar bağlanılıyor...');
              retryTimeout = setTimeout(() => {
                initPeer();
              }, 2000);
            } else {
              setStatus('Bağlantı hatası: ' + err.type);
            }
          });
        };

        const attemptCall = (peerObj, currentStream) => {
          if (role !== 'STUDENT') return;
          
          const makeCall = () => {
            if (remoteStream) return; // already connected
            
            console.log('Calling teacher:', targetPeerId);
            const outgoingCall = peerObj.call(targetPeerId, currentStream);
            if (outgoingCall) {
              callRef.current = outgoingCall;
              
              outgoingCall.on('stream', (rStream) => {
                setRemoteStream(rStream);
                setStatus('Ders başladı.');
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = rStream;
                }
                if (callRetryInterval) clearInterval(callRetryInterval);
              });
              
              outgoingCall.on('close', () => {
                setRemoteStream(null);
                setStatus('Öğretmen dersten ayrıldı.');
              });
            }
          };

          makeCall();
          // Retry calling every 4 seconds if not connected
          callRetryInterval = setInterval(() => {
            if (!remoteStream) {
              makeCall();
            } else {
              clearInterval(callRetryInterval);
            }
          }, 4000);
        };

        initPeer();

      } catch (err) {
        console.error('Failed to get media stream or peer:', err);
        setStatus('Kamera veya mikrofon izni verilmedi veya donanım hatası oluştu.');
      }
    };

    startMeeting();

    return () => {
      if (callRetryInterval) clearInterval(callRetryInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (callRef.current) callRef.current.close();
      if (peerInstance) peerInstance.destroy();
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [lessonId, role]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        if (callRef.current && callRef.current.peerConnection) {
          const senders = callRef.current.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        // Display screen sharing stream in local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Listen for stop sharing event (triggered by browser UI stop share button)
        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera track in call
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0];
      if (cameraTrack && callRef.current && callRef.current.peerConnection) {
        const senders = callRef.current.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
      // Restore local preview back to camera
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }

    setIsScreenSharing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[999] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">video_camera_front</span>
          </div>
          <div>
            <h4 className="font-bold text-sm md:text-base">Canlı Matematik Sınıfı</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
        >
          <span className="material-symbols-outlined text-sm">call_end</span>
          Dersi Sonlandır
        </button>
      </div>

      {/* Main Video Arena */}
      <div className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden">
        {/* Remote Video (Full Screen) */}
        <div className="w-full h-full absolute inset-0 bg-slate-900 flex items-center justify-center">
          {remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{status}</p>
            </div>
          )}
        </div>

        {/* Local Video (Floating Card) */}
        <div className="absolute bottom-24 right-6 w-48 aspect-[3/4] bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-300">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-3xl">videocam_off</span>
              <span className="text-[10px] font-bold mt-1 uppercase">Kamera Kapalı</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-slate-950/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider">
            Sen {isMuted && '🎤 Kapalı'} {isScreenSharing && '🖥️ Paylaşımda'}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border-t border-white/5 py-4 px-6 flex justify-center items-center gap-4 shadow-2xl z-20">
        <button 
          onClick={toggleMute}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isMuted 
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-950/20' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          <span className="material-symbols-outlined">
            {isMuted ? 'mic_off' : 'mic'}
          </span>
        </button>

        <button 
          onClick={toggleVideo}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isVideoOff 
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-950/20' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title={isVideoOff ? "Kamerayı Aç" : "Kamerayı Kapat"}
        >
          <span className="material-symbols-outlined">
            {isVideoOff ? 'videocam_off' : 'videocam'}
          </span>
        </button>

        <button 
          onClick={toggleScreenShare}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isScreenSharing 
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-950/20' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title={isScreenSharing ? "Paylaşımı Durdur" : "Ekranı Paylaş"}
        >
          <span className="material-symbols-outlined">
            {isScreenSharing ? 'cancel_presentation' : 'present_to_all'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LiveMeeting;
