import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaTimes, FaRedo, FaUpload, FaSearch, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
  }
};

const extractTicketNumber = (content) => {
  if (!content || typeof content !== 'string') return '';
  const clean = content.trim();

  // 1. If it's a JSON string
  if (clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      return parsed.ticketNumber || parsed.tkt || parsed.ticket || clean;
    } catch {}
  }

  // 2. If it's an ETHIOTRIP format (ETHIOTRIP:TKT-xxx:...)
  if (clean.startsWith('ETHIOTRIP:')) {
    const parts = clean.split(':');
    if (parts[1]) return parts[1].trim();
  }

  // 3. If it contains TICKET: TKT-xxx
  if (clean.includes('TICKET:')) {
    const match = clean.match(/TICKET:\s*([^\s\n\r|;]+)/i);
    if (match && match[1]) return match[1].trim();
  }

  // 4. If it's a URL with ticket param (e.g. ?ticket=TKT-xxx)
  if (clean.includes('ticket=')) {
    const match = clean.match(/ticket=([^&\s]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]).trim();
  }

  // 5. If it contains a ticket pattern like TKT-... or ETH-...
  const tktMatch = clean.match(/\b(TKT-[A-Z0-9-]+|ETH-[A-Z0-9-]+)\b/i);
  if (tktMatch && tktMatch[1]) return tktMatch[1].trim();

  return clean;
};

const CameraQRScanner = ({ onScan, onClose, isScanning, activeSchedule }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameId = useRef(null);
  const scanningActive = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [manualInput, setManualInput] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser. Please use manual code entry or upload an image.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanningActive.current = true;
        startScanningFrames();
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      scanningActive.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser or enter ticket code manually.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can enter the ticket number or upload a photo.');
      } else {
        setCameraError('Unable to access camera. You can manually enter the ticket code below.');
      }
    }
  };

  const stopCamera = () => {
    scanningActive.current = false;
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startScanningFrames = () => {
    const scanLoop = () => {
      if (!scanningActive.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data && code.data.trim()) {
              scanningActive.current = false;
              playBeep();
              handleDetected(code.data.trim());
              return;
            }
          }
        }
      }

      animFrameId.current = requestAnimationFrame(scanLoop);
    };

    animFrameId.current = requestAnimationFrame(scanLoop);
  };

  const handleDetected = (rawContent) => {
    const cleanTicketNumber = extractTicketNumber(rawContent);
    toast.success(`Ticket scanned: ${cleanTicketNumber}`);
    if (onScan) {
      onScan(cleanTicketNumber);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      toast.warning('Please enter a ticket number');
      return;
    }
    const clean = extractTicketNumber(manualInput.trim());
    handleDetected(clean);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data && code.data.trim()) {
            playBeep();
            handleDetected(code.data.trim());
          } else {
            toast.warning('No QR code detected in this photo. Please enter the ticket number below.');
          }
          setAnalyzingImage(false);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Could not process QR image');
      setAnalyzingImage(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl max-w-[420px] mx-auto transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="m-0 text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FaCamera className="text-indigo-600 dark:text-indigo-400" /> Live QR Scanner
          </h3>
          <p className="m-0 mt-0.5 text-slate-500 dark:text-slate-400 text-xs">
            Point camera at passenger's printed ticket or phone screen
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center cursor-pointer transition border-none"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Video Viewport */}
      <div className="relative w-full max-w-[340px] h-56 mx-auto mb-3.5 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          muted
          playsInline
        />

        <canvas ref={canvasRef} className="hidden" />

        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-indigo-500/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.55),0_0_15px_rgba(99,102,241,0.4)]">
              {/* Laser animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-sky-400 shadow-[0_0_8px_#22c55e] animate-pulse" />

              {/* Corner brackets */}
              <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-[3.5px] border-l-[3.5px] border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-[3.5px] border-r-[3.5px] border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-[3.5px] border-l-[3.5px] border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-[3.5px] border-r-[3.5px] border-emerald-400 rounded-br-lg" />
            </div>

            <div className="absolute bottom-2 text-white text-[11px] font-bold bg-black/70 px-3 py-0.5 rounded-full backdrop-blur-xs">
              Align QR code inside target box
            </div>
          </div>
        )}

        {!cameraActive && (
          <div className="text-center p-4 text-slate-300 max-w-[300px]">
            <div className={`w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-xl ${cameraError ? 'text-red-400' : 'text-indigo-400'}`}>
              {cameraError ? <FaExclamationTriangle /> : <FaCamera />}
            </div>
            <div className="font-extrabold text-sm text-white mb-1">
              {cameraError ? 'Camera Notice' : 'Camera Ready'}
            </div>
            <div className="text-xs text-slate-400 mb-3 leading-snug">
              {cameraError || 'Click below to start live camera scanning.'}
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/25 transition border-none"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex gap-2 flex-wrap mb-3">
        {cameraActive ? (
          <>
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 py-2 px-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs cursor-pointer transition border-none"
            >
              Pause Camera
            </button>
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <FaRedo /> Switch Camera ({facingMode === 'environment' ? 'Back' : 'Front'})
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition border-none"
          >
            <FaCamera /> Turn On Camera
          </button>
        )}

        <label className="py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
          <FaUpload /> {analyzingImage ? 'Reading...' : 'Scan Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Manual Code Fallback */}
      <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Or type Ticket Number..."
          className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
        <button
          type="submit"
          disabled={!manualInput.trim()}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition border-none flex items-center gap-1"
        >
          <FaSearch /> Validate
        </button>
      </form>
    </div>
  );
};

export default CameraQRScanner;
