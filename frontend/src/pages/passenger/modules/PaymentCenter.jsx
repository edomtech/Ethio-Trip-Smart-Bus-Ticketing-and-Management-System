import React, { useState } from 'react';
import {
  FaCreditCard, FaUniversity, FaCheckCircle, FaLock,
  FaShieldAlt, FaBus, FaArrowRight, FaClock, FaTicketAlt, FaReceipt,
  FaExclamationCircle, FaInfoCircle, FaCheckDouble, FaTimes
} from 'react-icons/fa';

// Custom SVG Icons matching the clean UI in the uploaded image
const TelebirrIcon = () => (
  <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="20" fill="#f5f3ff" />
    <rect x="22" y="14" width="36" height="52" rx="7" stroke="#7c3aed" strokeWidth="4" fill="none" />
    <rect x="34" y="20" width="12" height="3" rx="1.5" fill="#7c3aed" />
    <circle cx="40" cy="59" r="2.5" fill="#7c3aed" />
    <rect x="28" y="28" width="32" height="24" rx="4" fill="#7c3aed" />
    <rect x="46" y="36" width="10" height="8" rx="2" fill="#ede9fe" />
    <circle cx="51" cy="40" r="1.5" fill="#7c3aed" />
  </svg>
);

const CbeBirrIcon = () => (
  <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="20" fill="#eff6ff" />
    <path d="M40 16L18 28H62L40 16Z" fill="#2563eb" />
    <rect x="20" y="28" width="40" height="4" fill="#2563eb" />
    <rect x="24" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="37" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="50" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="18" y="58" width="44" height="6" rx="1" fill="#2563eb" />
  </svg>
);

const ChapaIcon = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="#10b981" strokeWidth="6" strokeDasharray="60 30" />
      <circle cx="24" cy="24" r="18" stroke="#f59e0b" strokeWidth="6" strokeDasharray="25 65" strokeDashoffset="-60" />
    </svg>
    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
      chapa
    </span>
  </div>
);

const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'Telebirr Wallet',
    color: '#6d28d9',
    buttonColor: '#6d28d9',
    hoverColor: '#5b21b6',
    icon: <TelebirrIcon />,
    description: 'Pay directly using your Telebirr mobile wallet or Telebirr SuperApp.',
  },
  {
    id: 'cbe',
    name: 'CBE Birr Mobile',
    color: '#2563eb',
    buttonColor: '#2563eb',
    hoverColor: '#1d4ed8',
    icon: <CbeBirrIcon />,
    description: 'Direct payment via Commercial Bank of Ethiopia (CBE) mobile banking.',
  },
  {
    id: 'chapa',
    name: 'Chapa Payment Gateway',
    color: '#059669',
    buttonColor: '#059669',
    hoverColor: '#047857',
    icon: <ChapaIcon />,
    description: 'Pay instantly via Chapa Ethiopian fintech gateway supporting all local wallets & cards.',
  },
];

const PaymentCenter = ({ myBookings = [], onSelectBus, onPayBooking, onViewTicket }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showBookFirstModal, setShowBookFirstModal] = useState(false);

  const pendingBookings = myBookings.filter(
    (b) => b.status === 'pending_payment' || b.paymentStatus === 'unpaid' || b.status === 'pending'
  );

  const handleArrowClick = (method) => {
    if (pendingBookings.length > 0 && onPayBooking) {
      onPayBooking(pendingBookings[0]);
    } else {
      setSelectedMethod(method);
      setShowBookFirstModal(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ marginTop: 4 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 18px 2px' }}>
          Payment Methods
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.id}
              style={{
                background: '#ffffff',
                borderRadius: 24,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div
                style={{
                  padding: '38px 24px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 180,
                  textAlign: 'center',
                }}
              >
                <div style={{ marginBottom: 18 }}>
                  {m.icon}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  {m.name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleArrowClick(m)}
                style={{
                  width: '100%',
                  background: m.buttonColor,
                  border: 'none',
                  color: '#ffffff',
                  padding: '16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = m.hoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.background = m.buttonColor)}
                title={`Pay with ${m.name}`}
              >
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {pendingBookings.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '2px solid #ef4444',
            padding: 22,
            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.08)',
            marginTop: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 900, fontSize: '1.05rem', marginBottom: 14 }}>
            <FaExclamationCircle /> You have {pendingBookings.length} Pending Booking{pendingBookings.length > 1 ? 's' : ''} Awaiting Payment
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {pendingBookings.map((bk) => (
              <div
                key={bk._id}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 14,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                      {bk.schedule?.companyId?.companyName || 'Intercity Bus'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>
                    {bk.schedule?.route?.from || 'Addis Ababa'} → {bk.schedule?.route?.to || 'Destination'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #fecaca', paddingTop: 10 }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626' }}>
                    ETB {bk.totalPrice?.toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPayBooking && onPayBooking(bk)}
                    style={{
                      padding: '8px 18px',
                      background: '#078930',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FaCreditCard /> Pay Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBookFirstModal && (
        <div
          onClick={() => setShowBookFirstModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 24,
              maxWidth: 480,
              width: '100%',
              padding: '28px 26px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
              animation: 'fadeInUp 0.25s ease-out',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowBookFirstModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <FaTimes />
            </button>

            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto 16px',
                border: '2px solid #bbf7d0',
              }}
            >
              <FaBus />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.28rem', fontWeight: 900, color: '#0f172a' }}>
              Please Book a Bus First!
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              You selected <strong>{selectedMethod?.name || 'this payment method'}</strong>. To proceed with payment, please search for available bus schedules, select your departure seats, and complete your reservation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowBookFirstModal(false);
                  if (onSelectBus) onSelectBus();
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#078930',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 14,
                  fontWeight: 900,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 6px 18px rgba(7, 137, 48, 0.35)',
                }}
              >
                <FaBus /> Search &amp; Book Bus <FaArrowRight />
              </button>

              <button
                type="button"
                onClick={() => setShowBookFirstModal(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCenter;
