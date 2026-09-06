import React from 'react';
import {
  FaTimes, FaUser, FaPhone, FaBus, FaCalendarAlt, FaClock,
  FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle, FaQrcode,
  FaTicketAlt, FaShieldAlt, FaMoneyBillWave
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

const PassengerDetailsModal = ({ passenger, trip, onClose, onScanToBoard }) => {
  if (!passenger) return null;

  const isAgentVerified = passenger.verificationStatus === 'VERIFIED';
  const isBoarded = passenger.boardingStatus === 'BOARDED';
  const qrString = `ETHIOTRIP:${passenger.ticketNumber || passenger._id}:${passenger.seatNumber}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'popIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>

        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#a5b4fc', fontWeight: 700 }}>
              Passenger Booking Details
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '2px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaTicketAlt style={{ color: '#38bdf8' }} /> {passenger.passengerName || 'Passenger'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Status Banners */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Agent Verification Status */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: isAgentVerified ? '#f0fdf4' : '#fffbeb',
                border: `1.5px solid ${isAgentVerified ? '#bbf7d0' : '#fde68a'}`,
              }}
            >
              <div style={{ fontSize: '0.7rem', color: isAgentVerified ? '#166534' : '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                Agent Verification
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.92rem', color: isAgentVerified ? '#16a34a' : '#d97706', marginTop: 2 }}>
                {isAgentVerified ? <FaCheckCircle /> : <FaExclamationTriangle />}
                {passenger.verificationStatus || 'PENDING'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                {isAgentVerified ? `Verified by ${passenger.verifiedBy?.name || 'Counter Agent'}` : 'Requires verification at ticket counter'}
              </div>
            </div>

            {/* Boarding Status */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: isBoarded ? '#e0e7ff' : '#f8fafc',
                border: `1.5px solid ${isBoarded ? '#c7d2fe' : '#e2e8f0'}`,
              }}
            >
              <div style={{ fontSize: '0.7rem', color: isBoarded ? '#3730a3' : '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                Boarding Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.92rem', color: isBoarded ? '#4f46e5' : '#64748b', marginTop: 2 }}>
                {isBoarded ? <FaCheckCircle /> : <FaBus />}
                {passenger.boardingStatus || 'NOT_BOARDED'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                {isBoarded ? `Boarded ${passenger.boardedAt ? new Date(passenger.boardedAt).toLocaleTimeString() : 'at departure'}` : 'Awaiting ticket scan to board'}
              </div>
            </div>
          </div>

          {/* Passenger Info Grid */}
          <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Passenger Full Name</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaUser style={{ color: '#6366f1' }} /> {passenger.passengerName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Contact Phone</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaPhone style={{ color: '#10b981' }} /> {passenger.passengerPhone || passenger.user?.phone || '0911223344'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Assigned Seat</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4f46e5' }}>
                  Seat {passenger.seatNumber}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Ticket Number</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                  {passenger.ticketNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Trip & Route Details */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaBus style={{ color: '#4f46e5' }} /> Trip &amp; Travel Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Route</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                  {trip?.route?.from || 'Addis Ababa'} → {trip?.route?.to || 'Destination'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Date &amp; Departure</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                  {trip?.date || 'Today'} ({trip?.departureTime || '06:00 AM'})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bus / Coach</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                  {trip?.bus?.busNumber || 'Assigned Coach'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ticket Fare</div>
                <div style={{ fontWeight: 900, color: '#16a34a', fontSize: '0.95rem' }}>
                  ETB {passenger.price || trip?.price || 950} (PAID)
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Scan Prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1', padding: 16 }}>
            <div style={{ background: '#fff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', flexShrink: 0 }}>
              <QRCodeSVG value={qrString} size={76} level="M" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Digital Boarding Pass QR
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                {isBoarded
                  ? 'Passenger is boarded. This boarding pass is marked as used.'
                  : isAgentVerified
                  ? 'Ready for boarding! Conductor must scan QR code at the bus door to board.'
                  : 'Ticket is waiting for Agent verification. Direct boarding is prohibited until verified.'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>

          {!isBoarded && (
            <button
              onClick={() => {
                onClose();
                if (onScanToBoard) onScanToBoard(passenger);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: isAgentVerified ? '#4f46e5' : '#64748b',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isAgentVerified ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
              }}
            >
              <FaQrcode /> Scan QR to Confirm Boarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerDetailsModal;
