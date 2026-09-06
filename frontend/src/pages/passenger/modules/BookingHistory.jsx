import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaDownload, FaCreditCard, FaHeadset } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import TicketModal from '../../../components/TicketModal';
import PaymentModal from '../../../components/PaymentModal';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const BookingHistory = ({ onAskSupport = null, onPay = null }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  useEffect(() => {
    bookingAPI
      .getMyBookings()
      .then((res) => {
        setBookings(res || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load bookings');
        setLoading(false);
      });
  }, []);

  const filtered = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.ticketNumber || '').toLowerCase().includes(q) ||
      (b.companyId?.companyName || '').toLowerCase().includes(q) ||
      (`${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`).toLowerCase().includes(q)
    );
  });

  const isConfirmedBooking = (b) => {
    const st = (b.status || '').toLowerCase();
    const ps = (b.paymentStatus || '').toLowerCase();
    return st === 'confirmed' || st === 'completed' || ps === 'paid' || ps === 'completed';
  };

  const stats = [
    { label: 'Total Bookings', val: bookings.length, color: '#0284c7' },
    { label: 'Confirmed', val: bookings.filter(isConfirmedBooking).length, color: '#16a34a' },
    { label: 'Pending Payment', val: bookings.filter((b) => (b.status || '').toLowerCase().includes('pending')).length, color: '#d97706' },
  ];

  const columns = [
    {
      header: 'Ticket No',
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const ps = (b.paymentStatus || '').toLowerCase();
        const isPaid = (st === 'confirmed' || st === 'completed') && (ps === 'paid' || ps === 'completed') && b.ticketNumber;
        if (!isPaid) {
          return (
            <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
              —
            </span>
          );
        }
        return (
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#078930' }}>
            {b.ticketNumber}
          </span>
        );
      },
    },
    {
      header: 'Bus Operator',
      render: (b) => (
        <div>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>
            {b.companyId?.companyName || 'Ethio Trip'}
          </span>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {b.schedule?.bus?.type || 'Standard'}
          </div>
        </div>
      ),
    },
    {
      header: 'Trip Route',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Date: {b.schedule?.date || 'Upcoming'} · {b.schedule?.departureTime || ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Trip Type',
      render: (b) => (
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: 6,
          background: b.tripType === 'round' ? '#fef3c7' : '#f1f5f9',
          color: b.tripType === 'round' ? '#92400e' : '#475569',
          border: `1px solid ${b.tripType === 'round' ? '#fde68a' : '#e2e8f0'}`,
          display: 'inline-block',
          whiteSpace: 'nowrap'
        }}>
          {b.tripType === 'round' ? '🔁 Round-Trip' : 'One-Way'}
        </span>
      ),
    },
    {
      header: 'Seats',
      render: (b) => (
        <span className="eb-badge eb-badge-vip" style={{ background: '#e0f2fe', color: '#0284c7' }}>
          {Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '—'}
        </span>
      ),
    },
    {
      header: 'Fare Paid',
      render: (b) => <span style={{ fontWeight: 800, color: '#078930' }}>ETB {b.totalPrice}</span>,
    },
    {
      header: 'Status',
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const isConfirmed = st === 'confirmed' || st === 'completed';
        const isPending = st === 'pending' || st === 'pending_payment';
        return (
          <span className={`eb-badge ${isConfirmed ? 'eb-badge-active' : isPending ? 'eb-badge-pending' : 'eb-badge-inactive'}`}>
            {isConfirmed ? 'Confirmed' : isPending ? 'Pending Payment' : b.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const ps = (b.paymentStatus || '').toLowerCase();
        const isCancelled = st === 'cancelled';
        const isPaid = !isCancelled && (st === 'confirmed' || st === 'completed') && (ps === 'paid' || ps === 'completed') && Boolean(b.ticketNumber);

        const handleDelete = (id, tktNo) => {
          if (!window.confirm(`Are you sure you want to delete booking ${tktNo || ''} from history?`)) return;
          setBookings(prev => prev.filter(bk => bk._id !== id));
          toast.success(`Booking ${tktNo || ''} deleted`);
        };

        if (isCancelled) {
          return (
            <span style={{ color: '#ef4444', fontSize: '0.74rem', fontWeight: 800, background: '#fef2f2', padding: '3px 8px', borderRadius: 6 }}>
              Cancelled
            </span>
          );
        }

        if (!isPaid) {
          return (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => onPay ? onPay(b) : setSelectedBookingForPayment(b)}
                style={{
                  padding: '6px 12px',
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 5px rgba(217,119,6,0.2)',
                }}
                title="Pay now to get your E-Ticket"
              >
                <FaCreditCard /> Pay Now
              </button>
              {onAskSupport && (
                <button
                  type="button"
                  onClick={() => onAskSupport(b)}
                  title="Ask a question about this reservation"
                  style={{
                    padding: '6px 8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  <FaHeadset />
                </button>
              )}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedBooking(b)}
              className="eb-btn-action eb-btn-view"
              style={{
                padding: '6px 12px',
                background: '#078930',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Open and view official E-Ticket"
            >
              <FaTicketAlt /> E-Ticket
            </button>
            {onAskSupport && (
              <button
                type="button"
                onClick={() => onAskSupport(b)}
                title="Ask question to staff"
                style={{
                  padding: '6px 8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                <FaHeadset />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(b._id, b.ticketNumber)}
              title="Delete from history"
              style={{
                padding: '6px 9px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ✕
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        category="TRAVEL HISTORY & RESERVATIONS"
        title="My Booking History"
        icon={<FaTicketAlt />}
        subtitle="Review all your past, active, confirmed, and pending intercity bus reservations with official E-ticket downloads."
        stats={[
          { label: 'Total Bookings', value: bookings.length, color: '#0284c7' },
          { label: 'Confirmed Tickets', value: bookings.filter(isConfirmedBooking).length, color: '#16a34a' },
          { label: 'Pending Payment', value: bookings.filter((b) => (b.status || '').toLowerCase().includes('pending')).length, color: '#d97706' },
        ]}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ticket number, company, or route..."
        emptyMessage="No booking history found. Search and book your bus tickets anytime!"
      />

      {selectedBooking && <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
      {selectedBookingForPayment && (
        <PaymentModal
          booking={selectedBookingForPayment}
          onClose={() => setSelectedBookingForPayment(null)}
          onPaymentSuccess={(updated) => {
            setSelectedBookingForPayment(null);
            setBookings(prev => prev.map(b => b._id === updated._id ? updated : b));
            setSelectedBooking(updated);
            toast.success('Payment verified! Your official E-Ticket is ready.');
          }}
        />
      )}
    </div>
  );
};

export default BookingHistory;
