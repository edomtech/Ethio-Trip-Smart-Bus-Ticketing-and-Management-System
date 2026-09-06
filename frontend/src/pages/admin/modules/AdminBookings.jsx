import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaDownload, FaTicketAlt } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import TicketModal from '../../../components/TicketModal';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings((data || []).sort((a, b) => new Date(b.createdAt || b.bookingDate) - new Date(a.createdAt || a.bookingDate)));
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel and refund this passenger booking?')) return;
    setCancellingId(id);
    try {
      await bookingAPI.cancel(id);
      toast.success('Booking cancelled and seats released');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const [boardingFilter, setBoardingFilter] = useState('ALL'); // 'ALL' | 'BOARDED' | 'NOT_BOARDED'

  const filtered = bookings.filter((b) => {
    // Boarding filter
    if (boardingFilter === 'BOARDED' && b.boardingStatus !== 'BOARDED' && !b.isBoarded) return false;
    if (boardingFilter === 'NOT_BOARDED' && (b.boardingStatus === 'BOARDED' || b.isBoarded)) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.ticketNumber || '').toLowerCase().includes(q) ||
      (b.passenger?.name || '').toLowerCase().includes(q) ||
      (b.passenger?.email || '').toLowerCase().includes(q) ||
      (b.passenger?.phone || '').includes(q) ||
      (`${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`).toLowerCase().includes(q)
    );
  });

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'completed' || b.paymentStatus === 'PAID' || b.status === 'confirmed' || b.status === 'CONFIRMED')
    .reduce((s, b) => s + (b.totalPrice || 0), 0);

  const boardedCount = bookings.filter(b => b.boardingStatus === 'BOARDED' || b.isBoarded).length;
  const notBoardedCount = bookings.filter(b => (b.status === 'confirmed' || b.status === 'CONFIRMED' || b.paymentStatus === 'PAID') && b.boardingStatus !== 'BOARDED' && !b.isBoarded).length;

  const columns = [
    {
      header: 'Ticket Number',
      render: (b) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#078930', display: 'block' }}>
            {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
          </span>
          <span style={{
            display: 'inline-block',
            marginTop: 3,
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 4,
            background: b.tripType === 'round' ? '#fef3c7' : '#f1f5f9',
            color: b.tripType === 'round' ? '#92400e' : '#475569',
            border: `1px solid ${b.tripType === 'round' ? '#fde68a' : '#e2e8f0'}`
          }}>
            {b.tripType === 'round' ? '🔁 Round-Trip' : 'One-Way'}
          </span>
        </div>
      ),
    },
    {
      header: 'Passenger',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.passenger?.name || 'Passenger'}</div>
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{b.passenger?.phone || b.passenger?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Route & Seats',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Seats: <strong style={{ color: '#0284c7' }}>{Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '—'}</strong>
          </div>
        </div>
      ),
    },
    {
      header: 'Travel Date',
      render: (b) => <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>{b.schedule?.date || 'Scheduled'}</span>,
    },
    {
      header: 'Boarding Status',
      render: (b) => {
        const isBrd = b.boardingStatus === 'BOARDED' || b.isBoarded;
        const isPart = b.boardingStatus === 'PARTIALLY_BOARDED';
        const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed' || b.status === 'confirmed' || b.status === 'CONFIRMED');
        const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled');

        if (isCancelled) {
          return <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>Cancelled</span>;
        }
        if (!isPaid) {
          return <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic' }}>Unpaid</span>;
        }

        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: '0.72rem',
            fontWeight: 800,
            background: isBrd ? '#ecfdf5' : isPart ? '#fffbeb' : '#f8fafc',
            color: isBrd ? '#059669' : isPart ? '#d97706' : '#64748b',
            border: `1.5px solid ${isBrd ? '#a7f3d0' : isPart ? '#fde68a' : '#cbd5e1'}`
          }}>
            {isBrd ? '✓ BOARDED' : isPart ? '⏳ PARTIAL' : '○ NOT BOARDED'}
          </span>
        );
      },
    },
    {
      header: 'Fare Paid',
      render: (b) => <span style={{ fontWeight: 800, color: '#0f172a' }}>ETB {b.totalPrice}</span>,
    },
    {
      header: 'Status',
      render: (b) => {
        const statusClass = (b.status || 'pending').toLowerCase();
        return <span className={`eb-badge eb-badge-${statusClass}`}>{b.status}</span>;
      },
    },
    {
      header: 'Actions',
      render: (b) => {
        const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed' || b.status === 'confirmed' || b.status === 'CONFIRMED');
        const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled' || b.paymentStatus === 'FAILED' || b.paymentStatus === 'failed');
        const canViewTicket = isPaid && !isCancelled;

        return (
          <div className="eb-action-group">
            {canViewTicket ? (
              <button
                onClick={() => setSelectedBooking(b)}
                className="eb-btn-action eb-btn-view"
                title="View & Download Ticket"
              >
                <FaDownload /> Ticket
              </button>
            ) : (
              <button
                disabled
                title={isCancelled ? "Booking is cancelled — ticket inactive" : "Payment pending — ticket inactive"}
                className="eb-btn-action"
                style={{ opacity: 0.5, cursor: 'not-allowed', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' }}
              >
                <FaDownload /> {isCancelled ? 'Cancelled' : 'Unpaid'}
              </button>
            )}
            {b.status === 'confirmed' && (
              <button
                onClick={() => handleCancel(b._id)}
                disabled={cancellingId === b._id}
                className="eb-btn-action eb-btn-delete"
              >
                <FaTimesCircle /> Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        category="RESERVATIONS & TICKETING"
        title="Passenger Bookings & Boarding Manifest"
        icon={<FaTicketAlt />}
        subtitle="Review passenger reservations, ticket verification numbers, trip types, and live boarded vs not-boarded passenger status."
        stats={[
          { label: 'Total Bookings', value: bookings.length, color: '#0284c7' },
          { label: 'Boarded Passengers', value: boardedCount, color: '#16a34a' },
          { label: 'Awaiting Boarding', value: notBoardedCount, color: '#d97706' },
          { label: 'Total Revenue', value: `ETB ${totalRevenue.toLocaleString()}`, color: '#078930' },
        ]}
      />

      {/* Boarding Status Filters */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All Bookings (${bookings.length})` },
          { id: 'BOARDED', label: `Boarded (${boardedCount})`, color: '#059669' },
          { id: 'NOT_BOARDED', label: `Not Boarded (${notBoardedCount})`, color: '#d97706' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setBoardingFilter(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: `1.5px solid ${boardingFilter === f.id ? (f.color || '#078930') : '#cbd5e1'}`,
              background: boardingFilter === f.id ? (f.color ? `${f.color}15` : '#ecfdf5') : '#ffffff',
              color: boardingFilter === f.id ? (f.color || '#078930') : '#475569',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all .15s'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bookings by ticket number, passenger name, phone..."
        emptyMessage="No passenger bookings found matching your filter criteria."
      />

      {selectedBooking && <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  );
};

export default AdminBookings;
