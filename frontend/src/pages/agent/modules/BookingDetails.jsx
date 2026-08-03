import React from 'react';
import { FaTicketAlt, FaUser, FaCalendarAlt, FaBus, FaQrcode, FaPrint, FaTimesCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import '../../modules.css';

const BookingDetails = ({ booking, onPrint, onCancel }) => {
  if (!booking) {
    return (
      <div className="mod-wrapper">
        <div className="mod-empty" style={{ background: '#fff', borderRadius: '24px', padding: '60px' }}>
          <div className="mod-empty-icon">🎫</div>
          <h4>No Booking Selected</h4>
          <p>Please search for a passenger booking to view details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Booking Details</h2>
          <p>Ticket #{booking.ticketNumber || 'BK001'} | Passenger: {booking.passenger?.name || 'Aynadis Tadele'}</p>
        </div>
        <div className="mod-header-icon"><FaTicketAlt /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        <div className="mod-card">
          <h3 style={{ marginBottom: '16px' }}>Passenger &amp; Route Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['Ticket Number', `#${booking.ticketNumber || 'BK001'}`],
              ['Passenger Name', booking.passenger?.name || 'Aynadis Tadele'],
              ['Phone Number', booking.passenger?.phone || '0911998877'],
              ['Route', `${booking.schedule?.route?.from || 'Addis Ababa'} → ${booking.schedule?.route?.to || 'Dire Dawa'}`],
              ['Travel Date', booking.schedule?.date || 'Today'],
              ['Departure Time', booking.schedule?.departureTime || '08:00 AM'],
              ['Seat Number', `#${Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(', ') : booking.selectedSeats || '04'}`],
              ['Total Fare Paid', `ETB ${booking.totalPrice || booking.price || 700}`],
              ['Payment Method', 'Telebirr (Completed)'],
              ['Status', booking.status || 'Confirmed'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '0.88rem' }}>{k}</span>
                <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{v}</strong>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {onPrint && (
              <button onClick={() => onPrint(booking)} className="mod-btn mod-btn-green" style={{ flex: 1 }}>
                <FaPrint /> Print Boarding Pass
              </button>
            )}
            {onCancel && booking.status !== 'cancelled' && (
              <button onClick={() => onCancel(booking._id)} className="mod-btn mod-btn-danger">
                <FaTimesCircle /> Cancel Booking
              </button>
            )}
          </div>
        </div>

        <div className="mod-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
            <QRCodeSVG value={`ETHIOBUS:${booking.ticketNumber || 'BK001'}`} size={160} fgColor="#078930" />
          </div>
          <h4 style={{ color: '#0f172a', margin: '0 0 4px' }}>Gate QR Code</h4>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Present at boarding gate scanner</span>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;
