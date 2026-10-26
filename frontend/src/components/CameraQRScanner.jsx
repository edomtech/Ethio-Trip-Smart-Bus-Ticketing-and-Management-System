import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaCamera,
  FaTimes,
  FaRedo,
  FaUpload,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSync,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // AudioContext might be blocked until user interaction
  }
};

const triggerVibration = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {}
};

export const extractTicketNumber = (content) => {
  if (!content || typeof content !== 'string') return '';
  const clean = content.trim();

  // 1. If it's a JSON string
  if (clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      return (
        parsed.ticketNumber ||
        parsed.ticketNo ||
        parsed.tkt ||
        parsed.ticket ||
        parsed.bookingReference ||
        parsed.bookingRef ||
        clean
      );
    } catch {}
  }

  // 2. If it contains TICKET: TKT-xxx
  if (clean.includes('TICKET:')) {
    const match = clean.match(/TICKET:\s*([^\s\n\r|;]+)/i);
    if (match && match[1]) return match[1].trim();
  }

  // 3. If it's an ETHIOTRIP format (ETHIOTRIP:TKT-xxx:... or ETHIOTRIP:TKT-xxx:seat)
  if (clean.startsWith('ETHIOTRIP:')) {
    const parts = clean.split(':');
    if (parts[1]) return parts[1].trim();
  }

  // 4. If it's a URL with ticket param (e.g. ?ticket=TKT-xxx or /verify?ticket=TKT-xxx)
  if (clean.includes('ticket=')) {
    const match = clean.match(/ticket=([^&\s]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]).trim();
  }

  // 5. If it contains a ticket pattern like TKT-... or ETH-...
  const tktMatch = clean.match(/\b(TKT-[A-Z0-9-]+|ETH-[A-Z0-9-]+)\b/i);
  if (tktMatch && tktMatch[1]) return tktMatch[1].trim();

  return clean;
};

const READER_ID = 'ethiotrip-live-qr-viewport';

const CameraQRScanner = ({ onScan, onClose, isScanning, activeSchedule }) => {
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const hasDetectedRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState('');

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      const scanner = scannerRef.current;
      if (scanner) {
        const state = scanner.getState?.();
        if (state === Html5QrcodeScannerState.SCANNING || scanner.isScanning) {
          await scanner.stop();
        }
        try {
          scanner.clear();
        } catch {}
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Error while stopping scanner:', err);
    } finally {
      if (isMountedRef.current) {
        setCameraActive(false);
      }
      isStoppingRef.current = false;
    }
  }, []);

  const handleDetected = useCallback((rawText) => {
    if (hasDetectedRef.current) return;
    hasDetectedRef.current = true;

    playBeep();
    triggerVibration();

    const ticketNo = extractTicketNumber(rawText);
    setLastScannedResult(ticketNo || rawText);

    if (onScan) {
      onScan(rawText);
    }
  }, [onScan]);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || !isMountedRef.current) return;
    isStartingRef.current = true;
    setCameraError('');
    setLastScannedResult('');
    hasDetectedRef.current = false;

    // Ensure any previously running instance is stopped cleanly
    await stopScanner();

    try {
      const container = document.getElementById(READER_ID);
      if (!container) {
        isStartingRef.current = false;
        return;
      }
      container.innerHTML = '';

      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;

      // 1. Enumerate video input devices
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        if (isMountedRef.current && Array.isArray(cameras)) {
          setAvailableCameras(cameras);
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras, will use facingMode fallback:', camErr);
      }

      // 2. Select best camera camera config
      let cameraConfig = null;

      if (selectedCameraId && cameras.some((c) => c.id === selectedCameraId)) {
        cameraConfig = selectedCameraId;
      } else if (cameras.length > 0) {
        if (facingMode === 'environment') {
          // Look for rear/environment camera
          const backCam = cameras.find((c) =>
            /back|rear|environment|facing back/i.test(c.label)
          );
          // On mobile phones, back camera is usually the last one in the enumerated list
          const chosen = backCam || (cameras.length > 1 ? cameras[cameras.length - 1] : cameras[0]);
          cameraConfig = chosen.id;
          if (isMountedRef.current) setSelectedCameraId(chosen.id);
        } else {
          // Look for front/user camera
          const frontCam = cameras.find((c) =>
            /front|user|facing front|webcam/i.test(c.label)
          );
          const chosen = frontCam || cameras[0];
          cameraConfig = chosen.id;
          if (isMountedRef.current) setSelectedCameraId(chosen.id);
        }
      } else {
        // Fallback to standard facingMode string (html5-qrcode accepts string: "environment" or "user")
        cameraConfig = { facingMode };
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minEdge * 0.76));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      try {
        await scanner.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            handleDetected(decodedText);
          },
          () => {
            // Ignore normal frame-by-frame no-QR warnings
          }
        );
      } catch (firstStartErr) {
        console.warn('Initial camera start failed, attempting fallback:', firstStartErr);

        // If environment/rear camera failed (common on laptops/desktops with only front webcam),
        // fallback to front camera or default camera
        if (facingMode === 'environment' || typeof cameraConfig === 'string') {
          const fallbackConfig = cameras.length > 0 ? cameras[0].id : { facingMode: 'user' };
          await scanner.start(
            fallbackConfig,
            scanConfig,
            (decodedText) => {
              handleDetected(decodedText);
            },
            () => {}
          );
        } else {
          throw firstStartErr;
        }
      }

      if (isMountedRef.current) {
        setCameraActive(true);
        setCameraError('');
      }
    } catch (err) {
      console.warn('Camera failed to start:', err);
      if (isMountedRef.current) {
        setCameraActive(false);
        const errStr = String(err?.message || err);
        if (err?.name === 'NotAllowedError' || errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setCameraError('Camera access was blocked by your browser. Please allow camera permissions in your address bar and click Retry.');
        } else if (err?.name === 'NotFoundError' || errStr.includes('NotFoundError')) {
          setCameraError('No camera found on this device. You can type the ticket number below or upload a ticket image.');
        } else {
          setCameraError('Unable to access camera feed. Please check camera permissions or enter the ticket number below.');
        }
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [facingMode, selectedCameraId, stopScanner, handleDetected]);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      startScanner();
    }, 120);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [facingMode, selectedCameraId]);

  const toggleCameraFacing = () => {
    setSelectedCameraId('');
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
    setCameraError('');

    try {
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
      toast.warning('No QR code detected in this photo. Please ensure the QR is clear or enter the ticket number.');
    } finally {
      setAnalyzingImage(false);
      e.target.value = '';
    }
  };

  const handleResetScan = () => {
    hasDetectedRef.current = false;
    setLastScannedResult('');
    startScanner();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl max-w-[420px] mx-auto transition-colors font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="m-0 text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm shadow-xs">
              <FaCamera />
            </span>
            <span>Passenger QR Scanner</span>
          </h3>
          <p className="m-0 mt-0.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
            Scan passenger QR pass, printed ticket, or phone screen
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center cursor-pointer transition border-none text-sm"
            title="Close Scanner"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Viewfinder Container */}
      <div className="relative w-full max-w-[340px] h-[260px] mx-auto mb-3.5 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner border border-slate-800">
        <div id={READER_ID} className="w-full h-full object-cover" />

        {/* Live reticle overlay when active */}
        {cameraActive && !lastScannedResult && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Viewfinder Target Frame */}
            <div className="w-48 h-48 border-2 border-dashed border-indigo-400/80 rounded-2xl relative flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-indigo-500 rounded-tl-md" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-indigo-500 rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-indigo-500 rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-indigo-500 rounded-br-md" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute shadow-[0_0_8px_#38bdf8]" />
            </div>

            <div className="absolute bottom-3 text-center">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide border border-white/10">
                Align QR Code inside box
              </span>
            </div>
          </div>
        )}

        {/* Scanned Success Overlay */}
        {lastScannedResult && (
          <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-2 border border-emerald-400/30">
              <FaCheckCircle />
            </div>
            <div className="font-extrabold text-base mb-1">QR Code Detected!</div>
            <div className="font-mono text-xs text-emerald-200 bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/30 mb-3 max-w-[260px] truncate">
              {lastScannedResult}
            </div>
            <button
              type="button"
              onClick={handleResetScan}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md transition border-none flex items-center gap-1.5"
            >
              <FaSync /> Scan Again
            </button>
          </div>
        )}

        {/* Inactive or Error State Overlay */}
        {!cameraActive && !lastScannedResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/92 text-slate-300 z-10">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2.5 text-xl ${
                cameraError
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
              }`}
            >
              {cameraError ? <FaExclamationTriangle /> : <FaCamera />}
            </div>
            <div className="font-black text-sm text-white mb-1">
              {cameraError ? 'Camera Notice' : 'Scanner Ready'}
            </div>
            <div className="text-xs text-slate-400 mb-3.5 leading-snug max-w-[270px]">
              {cameraError || 'Click below to turn on the camera and scan passenger tickets.'}
            </div>
            <button
              type="button"
              onClick={startScanner}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/30 transition border-none flex items-center gap-2"
            >
              <FaCamera /> {cameraError ? 'Retry Camera' : 'Turn On Camera'}
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex gap-2 flex-wrap mb-3.5">
        {cameraActive ? (
          <>
            <button
              type="button"
              onClick={stopScanner}
              className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-bold text-xs cursor-pointer transition"
            >
              Pause Camera
            </button>
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              title="Switch camera"
            >
              <FaRedo /> Switch ({facingMode === 'environment' ? 'Back' : 'Front'})
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startScanner}
            className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition border-none"
          >
            <FaCamera /> Turn On Camera
          </button>
        )}
      </div>

      {/* Manual Code Fallback */}
      <form
        onSubmit={handleManualSubmit}
        className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
      >
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Or enter Ticket No (e.g. TKT-..., ETH-...)"
          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
        <button
          type="submit"
          disabled={!manualInput.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition border-none flex items-center gap-1.5 shrink-0"
        >
          <FaSearch /> Validate
        </button>
      </form>
    </div>
  );
};

export default CameraQRScanner;
