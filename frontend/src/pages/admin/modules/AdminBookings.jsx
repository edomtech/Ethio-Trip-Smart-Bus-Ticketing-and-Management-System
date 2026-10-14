import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaDownload, FaTicketAlt } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import TicketModal from '../../../components/TicketModal';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const AdminBookings = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [boardingFilter, setBoardingFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings((data || []).sort((a, b) => new Date(b.createdAt || b.bookingDate) - new Date(a.createdAt || a.bookingDate)));
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (booking) => {
    const id = booking?._id;
    const tktNo = booking?.ticketNumber;
    const passenger = booking?.passenger?.name;

    const confirmed = await notify.confirm({
      title: t('cancel and refund booking', 'Cancel and Refund Booking?'),
      message: `${t('are you sure you want to cancel', 'Are you sure you want to cancel')} ${tktNo ? `${t('ticket no', 'Ticket No')} ${tktNo}` : t('this booking', 'this booking')}${passenger ? ` ${t('for', 'for')} ${passenger}` : ''}?`,
      description: t('booked seats will be released back', 'The booked seats will be released back to available inventory and a refund will be requested. This action cannot be undone.'),
      confirmLabel: t('cancel & refund', 'Cancel & Refund'),
      cancelLabel: t('keep booking', 'Keep Booking'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setCancellingId(id);
    try {
      await bookingAPI.cancel(id);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'cancelled', paymentStatus: 'refund_requested' } : b))
      );
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.booking.cancelFailed);
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
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

  const boardedCount = bookings.filter(b => b.boardingStatus === 'BOARDED' || b.isBoarded).length;
  const notBoardedCount = bookings.filter(b => (b.status === 'confirmed' || b.status === 'CONFIRMED' || b.paymentStatus === 'PAID') && b.boardingStatus !== 'BOARDED' && !b.isBoarded).length;

  const columns = [
    {
      header: t('ticket.ticketNo', 'Ticket Number'),
      render: (b) => (
        <div>
          <span className="font-mono font-extrabold text-eb-green block">
            {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
          </span>
          <span className={`inline-block mt-0.5 text-[0.66rem] font-extrabold px-1.5 py-0.5 rounded border ${
            b.tripType === 'round'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {b.tripType === 'round' ? `🔁 ${t('round-trip', 'Round-Trip')}` : t('one-way', 'One-Way')}
          </span>
        </div>
      ),
    },
    {
      header: t('passenger', 'Passenger'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">{b.passenger?.name || t('passenger', 'Passenger')}</div>
          <div className="text-slate-500 text-xs">{b.passenger?.phone || b.passenger?.email || '—'}</div>
        </div>
      ),
    },
    {
      header: t('route & seats', 'Route & Seats'),
      render: (b) => (
        <div>
          <div className="font-semibold text-slate-900">
            {t(b.schedule?.route?.from || 'Origin', b.schedule?.route?.from || 'Origin')} → {t(b.schedule?.route?.to || 'Destination', b.schedule?.route?.to || 'Destination')}
          </div>
          <div className="text-[0.72rem] text-slate-500">
            {t('seats', 'Seats')}: <strong className="text-sky-600">{Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '—'}</strong>
          </div>
        </div>
      ),
    },
    {
      header: t('travel date', 'Travel Date'),
      render: (b) => <span className="text-slate-500 text-[0.8rem] font-semibold">{b.schedule?.date || t('scheduled', 'Scheduled')}</span>,
    },
    {
      header: t('boarding status', 'Boarding Status'),
      render: (b) => {
        const isBrd = b.boardingStatus === 'BOARDED' || b.isBoarded;
        const isPart = b.boardingStatus === 'PARTIALLY_BOARDED';
        const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed' || b.status === 'confirmed' || b.status === 'CONFIRMED');
        const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled');

        if (isCancelled) {
          return <span className="text-red-500 text-[0.72rem] font-bold">{t('cancelled', 'Cancelled')}</span>;
        }
        if (!isPaid) {
          return <span className="text-slate-400 text-[0.72rem] italic">{t('unpaid', 'Unpaid')}</span>;
        }

        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.72rem] font-extrabold border-[1.5px] ${
            isBrd
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : isPart
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-slate-50 text-slate-500 border-slate-300'
          }`}>
            {isBrd ? `✓ ${t('boarded', 'BOARDED')}` : isPart ? `⏳ ${t('partial', 'PARTIAL')}` : `○ ${t('not boarded', 'NOT BOARDED')}`}
          </span>
        );
      },
    },
    {
      header: t('fare paid', 'Fare Paid'),
      render: (b) => <span className="font-extrabold text-slate-900">ETB {b.totalPrice}</span>,
    },
    {
      header: t('common.status', 'Status'),
      render: (b) => {
        const statusClass = (b.status || 'pending').toLowerCase();
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold capitalize border ${
            statusClass === 'confirmed' || statusClass === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            statusClass === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          }`}>
            {t(b.status, b.status)}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (b) => {
        const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed' || b.status === 'confirmed' || b.status === 'CONFIRMED');
        const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled' || b.paymentStatus === 'FAILED' || b.paymentStatus === 'failed');
        const canViewTicket = isPaid && !isCancelled;

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {canViewTicket ? (
              <button
                onClick={() => setSelectedBooking(b)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors"
                title={t('view e-ticket', 'View & Download Ticket')}
              >
                <FaDownload /> {t('ticket', 'Ticket')}
              </button>
            ) : (
              <button
                disabled
                title={isCancelled ? t('booking cancelled', 'Booking is cancelled — ticket inactive') : t('payment pending', 'Payment pending — ticket inactive')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-300 text-[0.76rem] font-bold"
              >
                <FaDownload /> {isCancelled ? t('cancelled', 'Cancelled') : t('unpaid', 'Unpaid')}
              </button>
            )}
            {b.status === 'confirmed' && (
              <button
                onClick={() => handleCancel(b)}
                disabled={cancellingId === b._id}
                aria-label={`Cancel booking ${b.ticketNumber || ''}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaTimesCircle /> {cancellingId === b._id ? t('cancelling...', 'Cancelling…') : t('common.cancel', 'Cancel')}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex gap-2 my-3.5 flex-wrap">
        {[
          { id: 'ALL', label: `${t('all bookings', 'All Bookings')} (${bookings.length})` },
          { id: 'BOARDED', label: `${t('boarded', 'Boarded')} (${boardedCount})` },
          { id: 'NOT_BOARDED', label: `${t('not boarded', 'Not Boarded')} (${notBoardedCount})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setBoardingFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg border-[1.5px] text-[0.78rem] font-extrabold cursor-pointer transition-all duration-150 ${
              boardingFilter === f.id
                ? f.id === 'BOARDED'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : f.id === 'NOT_BOARDED'
                  ? 'border-amber-500 bg-amber-50 text-amber-600'
                  : 'border-eb-green bg-emerald-50 text-eb-green'
                : 'border-slate-300 bg-white text-slate-500'
            }`}
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
        searchPlaceholder={t('search bookings by ticket number, passenger name, phone...', 'Search bookings by ticket number, passenger name, phone...')}
        emptyMessage={t('no passenger bookings found matching criteria', 'No passenger bookings found matching your filter criteria.')}
      />

      {selectedBooking && <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  );
};

export default AdminBookings;
