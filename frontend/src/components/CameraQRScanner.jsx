import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaTimes, FaRedo, FaUpload, FaSearch, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Sound effect synthesizer for QR scan success
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext not allowed or not supported
  }
};

const CameraQRScanner = ({ onScan, onClose, isScanning, activeSchedule }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameId = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
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
        startScanningFrames();
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser or enter the ticket number below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can enter the ticket number or upload a QR image.');
      } else {
        setCameraError('Unable to access camera. You can manually enter the ticket code below.');
      }
    }
  };

  const stopCamera = () => {
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
    if (!('BarcodeDetector' in window)) return;

    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] });

      const scanLoop = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                playBeep();
                handleDetected(rawValue);
                return; // Stop scanning once detected
              }
            }
          } catch (e) {
            // Frame detection continue
          }
        }
        animFrameId.current = requestAnimationFrame(scanLoop);
      };

      animFrameId.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      console.warn('BarcodeDetector init error:', err);
    }
  };

  const handleDetected = (content) => {
    let clean = content.trim();
    if (clean.startsWith('ETHIOTRIP:')) {
      const parts = clean.split(':');
      clean = parts[1] || clean;
    } else if (clean.startsWith('{')) {
      try {
        const parsed = JSON.parse(clean);
        clean = parsed.ticketNumber || parsed.tkt || clean;
      } catch {
        // use raw
      }
    }

    toast.success(`Ticket scanned: ${clean}`);
    if (onScan) onScan(clean);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      toast.warning('Please enter a ticket number or QR code text');
      return;
    }
    handleDetected(manualInput.trim());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.onload = async () => {
          if ('BarcodeDetector' in window) {
            try {
              const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128'] });
              const barcodes = await detector.detect(img);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                playBeep();
                handleDetected(barcodes[0].rawValue);
                setAnalyzingImage(false);
                return;
              }
            } catch (err) {
              console.warn('Barcode detect from image failed:', err);
            }
          }

          toast.info('QR image loaded. You can also type the ticket number directly.');
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
    <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.06)', maxWidth: 420, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaCamera style={{ color: '#4f46e5' }} /> Live Camera QR Scanner
          </h3>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
            Point camera at passenger's printed ticket or smartphone screen
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Compact Video Viewport Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          height: 200,
          margin: '0 auto 14px',
          background: '#090d16',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8)',
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
          muted
          playsInline
        />

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Targeting Grid Overlay when Camera is Active */}
        {cameraActive && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 150,
                height: 150,
                border: '2px solid rgba(99, 102, 241, 0.8)',
                borderRadius: 16,
                position: 'relative',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55), 0 0 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              {/* Animated scanning laser line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'linear-gradient(90deg, transparent, #22c55e, #38bdf8, transparent)',
                  boxShadow: '0 0 8px #22c55e',
                  animation: 'scanLaser 2s infinite ease-in-out',
                }}
              />
              <style>{`
                @keyframes scanLaser {
                  0% { top: 10%; opacity: 0.2; }
                  50% { top: 90%; opacity: 1; }
                  100% { top: 10%; opacity: 0.2; }
                }
              `}</style>

              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: -2, left: -2, width: 18, height: 18, borderTop: '3.5px solid #4f46e5', borderLeft: '3.5px solid #4f46e5', borderTopLeftRadius: 8 }} />
              <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderTop: '3.5px solid #4f46e5', borderRight: '3.5px solid #4f46e5', borderTopRightRadius: 8 }} />
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: 18, height: 18, borderBottom: '3.5px solid #4f46e5', borderLeft: '3.5px solid #4f46e5', borderBottomLeftRadius: 8 }} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderBottom: '3.5px solid #4f46e5', borderRight: '3.5px solid #4f46e5', borderBottomRightRadius: 8 }} />
            </div>

            <div style={{ position: 'absolute', bottom: 10, color: '#f8fafc', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(0,0,0,0.65)', padding: '3px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
              Align QR code inside target
            </div>
          </div>
        )}

        {/* Fallback Screen if Camera is Off or Error */}
        {!cameraActive && (
          <div style={{ textAlign: 'center', padding: 16, color: '#cbd5e1', maxWidth: 300 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.2rem', color: cameraError ? '#f87171' : '#818cf8' }}>
              {cameraError ? <FaExclamationTriangle /> : <FaCamera />}
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc', marginBottom: 3 }}>
              {cameraError ? 'Camera Notice' : 'Camera Ready'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 12, lineHeight: 1.3 }}>
              {cameraError || 'Click below to start live camera scanning.'}
            </div>
            <button
              type="button"
              onClick={startCamera}
              style={{
                padding: '7px 16px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Start Camera
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {cameraActive ? (
          <>
            <button
              type="button"
              onClick={stopCamera}
              style={{
                flex: 1,
                padding: '9px 12px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Pause Camera
            </button>
            <button
              type="button"
              onClick={toggleCameraFacing}
              style={{
                padding: '9px 12px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FaRedo /> Switch Camera ({facingMode === 'environment' ? 'Back' : 'Front'})
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            style={{
              flex: 1,
              padding: '9px 12px',
              background: '#e0e7ff',
              color: '#4338ca',
              border: 'none',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FaCamera /> Turn On Camera
          </button>
        )}

        {/* QR Code Photo Upload Option */}
        <label
          style={{
            padding: '9px 14px',
            background: '#f8fafc',
            color: '#475569',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FaUpload /> {analyzingImage ? 'Reading...' : 'Scan Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
};

export default CameraQRScanner;
