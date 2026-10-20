import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaTimes, FaRedo, FaUpload, FaSearch, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Html5Qrcode } from 'html5-qrcode';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
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

const READER_ID = 'ethiotrip-html5-qr-reader';

const CameraQRScanner = ({ onScan, onClose, isScanning, activeSchedule }) => {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [manualInput, setManualInput] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const handleDetected = (rawText) => {
    const ticketNo = extractTicketNumber(rawText);
    playBeep();
    toast.success(`Ticket scanned: ${ticketNo}`);
    if (onScan) {
      // Pass the FULL raw payload so the backend can also read LEG / SEAT lines.
      onScan(rawText);
    }
  };

  const stopScanner = async ({ removeDom = false } = {}) => {
    const scanner = scannerRef.current;
    if (scanner && isRunningRef.current) {
      try {
        await scanner.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      isRunningRef.current = false;
    }

    if (removeDom && scanner) {
      try {
        scanner.clear();
      } catch (e) {
        console.warn('Error clearing scanner DOM:', e);
      }
      scannerRef.current = null;
    }

    setCameraActive(false);
  };

  const startScanner = async () => {
    setCameraError('');
    await stopScanner();

    try {
      const container = document.getElementById(READER_ID);
      if (!container) return;

      // Always rebuild on a clean container to avoid "element already has a child".
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
      container.innerHTML = '';

      scannerRef.current = new Html5Qrcode(READER_ID, { verbose: false });

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: { ideal: facingMode } },
        config,
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame read callback (no QR detected in this frame, ignore)
        }
      );

      isRunningRef.current = true;
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera start failure:', err);
      isRunningRef.current = false;
      setCameraActive(false);

      if (err?.name === 'NotAllowedError' || String(err).includes('NotAllowedError')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser or enter ticket number below.');
      } else if (err?.name === 'NotFoundError' || String(err).includes('NotFoundError')) {
        setCameraError('No camera found on this device. You can enter the ticket number or upload a photo.');
      } else {
        setCameraError('Unable to start camera. You can manually enter the ticket number or upload an image.');
      }
    }
  };

  useEffect(() => {
    // Start camera on mount
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopScanner({ removeDom: true });
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      toast.warning('Please enter a ticket number');
      return;
    }
    handleDetected(manualInput.trim());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    try {
      // scanFile() refuses to run while the live camera stream is active.
      await stopScanner();

      let scanner = scannerRef.current;
      if (!scanner) {
        const container = document.getElementById(READER_ID);
        if (container) container.innerHTML = '';
        scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleDetected(decodedText);
    } catch (err) {
      console.warn('File QR parse error:', err);
      toast.warning('No QR code detected in this photo. Please enter the ticket number below.');
    } finally {
      setAnalyzingImage(false);
      e.target.value = '';
    }
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

      {/* Video Viewport Container */}
      <div className="relative w-full max-w-[340px] h-64 mx-auto mb-3.5 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
        <div id={READER_ID} className="w-full h-full" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 text-slate-300">
            <div className={`w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-xl ${cameraError ? 'text-red-400' : 'text-indigo-400'}`}>
              {cameraError ? <FaExclamationTriangle /> : <FaCamera />}
            </div>
            <div className="font-extrabold text-sm text-white mb-1">
              {cameraError ? 'Camera Notice' : 'Scanner Inactive'}
            </div>
            <div className="text-xs text-slate-400 mb-3 leading-snug max-w-[280px]">
              {cameraError || 'Click below to turn on the camera.'}
            </div>
            <button
              type="button"
              onClick={startScanner}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/25 transition border-none"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap mb-3">
        {cameraActive ? (
          <>
            <button
              type="button"
              onClick={stopScanner}
              className="flex-1 py-2 px-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs cursor-pointer transition border-none"
            >
              Pause Camera
            </button>
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <FaRedo /> Switch ({facingMode === 'environment' ? 'Back' : 'Front'})
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startScanner}
            className="flex-1 py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition border-none"
          >
            <FaCamera /> Turn On Camera
          </button>
        )}

        <label className="py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition">
          <FaUpload /> {analyzingImage ? 'Scanning...' : 'Scan Photo'}
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
          placeholder="Or type Ticket Number (e.g. TKT-...)"
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
