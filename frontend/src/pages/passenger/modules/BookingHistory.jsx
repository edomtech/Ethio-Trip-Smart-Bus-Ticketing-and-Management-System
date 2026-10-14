import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaDownload, FaCreditCard, FaHeadset } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import TicketModal from '../../../components/TicketModal';
import PaymentModal from '../../../components/PaymentModal';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const BookingHistory = ({ onAskSupport = null, onPay = null }) => {
  const { t } = useTranslation();
  const notify = useNotification();
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
      .catch((err) => {
        notify.notifyError(err, MESSAGES.reports.loadFailed);
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

  const columns = [
    {
      header: t('ticket.ticketNo', 'Ticket No'),
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const ps = (b.paymentStatus || '').toLowerCase();
        const isPaid = (st === 'confirmed' || st === 'completed') && (ps === 'paid' || ps === 'completed') && b.ticketNumber;
        if (!isPaid) {
          return (
            <span className="text-slate-400 text-[0.78rem] font-semibold">
              —
            </span>
          );
        }
        return (
          <span className="font-mono font-extrabold text-[#078930] dark:text-emerald-400">
            {b.ticketNumber}
          </span>
        );
      },
    },
    {
      header: t('passenger.busOperator', 'Bus Operator'),
      render: (b) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {b.companyId?.companyName || 'Ethio Trip'}
          </span>
          <div className="text-[0.72rem] text-slate-500 dark:text-slate-400">
            {b.schedule?.bus?.type || 'Standard'}
          </div>
        </div>
      ),
    },
    {
      header: t('ticket.route', 'Trip Route'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
          </div>
          <div className="text-[0.72rem] text-slate-500 dark:text-slate-400">
            {t('common.date', 'Date')}: {b.schedule?.date || 'Upcoming'} · {b.schedule?.departureTime || ''}
          </div>
        </div>
      ),
    },
    {
      header: t('ticket.journeyLeg', 'Trip Type'),
      render: (b) => (
        <span className={`text-[0.72rem] font-extrabold py-1 px-2 rounded-md inline-block whitespace-nowrap border ${
          b.tripType === 'round'
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        }`}>
          {b.tripType === 'round' ? `🔁 ${t('home.tripTypeRound', 'Round-Trip')}` : t('home.tripTypeOneWay', 'One-Way')}
        </span>
      ),
    },
    {
      header: t('booking.selectedSeats', 'Seats'),
      render: (b) => (
        <span className="inline-block py-0.5 px-2 rounded-md text-xs font-bold bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
          {Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '—'}
        </span>
      ),
    },
    {
      header: t('ticket.totalFare', 'Fare Paid'),
      render: (b) => <span className="font-extrabold text-[#078930] dark:text-emerald-400">ETB {b.totalPrice}</span>,
    },
    {
      header: t('common.status', 'Status'),
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const isConfirmed = st === 'confirmed' || st === 'completed';
        const isPending = st === 'pending' || st === 'pending_payment';
        return (
          <span className={`inline-block py-0.5 px-2.5 rounded-full text-xs font-bold ${
            isConfirmed
              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              : isPending
              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {isConfirmed ? t('common.confirmed', 'Confirmed') : isPending ? t('passenger.pendingPayments', 'Pending Payment') : b.status}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (b) => {
        const st = (b.status || '').toLowerCase();
        const ps = (b.paymentStatus || '').toLowerCase();
        const isCancelled = st === 'cancelled';
        const isPaid = !isCancelled && (st === 'confirmed' || st === 'completed') && (ps === 'paid' || ps === 'completed') && Boolean(b.ticketNumber);

        const handleDelete = async (id, tktNo) => {
          const confirmed = await notify.confirm({
            title: t('passenger.removeBooking', 'Remove Booking From History?'),
            message: `${t('passenger.removeBookingConfirm', 'Are you sure you want to remove booking')} ${tktNo || ''}?`,
            description: t('passenger.removeBookingDesc', 'This only hides the booking from this view. Your booking and ticket records are not affected.'),
            confirmLabel: t('common.delete', 'Remove'),
            cancelLabel: t('common.cancel', 'Cancel'),
            variant: 'danger',
          });
          if (!confirmed) return;
          setBookings(prev => prev.filter(bk => bk._id !== id));
        };

        if (isCancelled) {
          return (
            <span className="text-red-500 bg-red-50 dark:bg-red-950/40 text-[0.74rem] font-extrabold py-1 px-2 rounded-md">
              {t('common.cancelled', 'Cancelled')}
            </span>
          );
        }

        if (!isPaid) {
          return (
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={() => onPay ? onPay(b) : setSelectedBookingForPayment(b)}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-extrabold text-[0.78rem] cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
                title={t('common.payNow', 'Pay Now')}
              >
                <FaCreditCard /> {t('common.payNow', 'Pay Now')}
              </button>
              {onAskSupport && (
                <button
                  type="button"
                  onClick={() => onAskSupport(b)}
                  title={t('passenger.askQuestion', 'Ask a question about this reservation')}
                  className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-[0.78rem] cursor-pointer hover:bg-blue-100 transition"
                >
                  <FaHeadset />
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={() => setSelectedBooking(b)}
              className="py-1.5 px-3 bg-[#078930] hover:bg-emerald-700 text-white rounded-lg font-extrabold text-[0.78rem] cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
              title={t('passenger.viewETicket', 'Open and view official E-Ticket')}
            >
              <FaTicketAlt /> {t('ticket.title', 'E-Ticket')}
            </button>
            {onAskSupport && (
              <button
                type="button"
                onClick={() => onAskSupport(b)}
                title={t('passenger.askQuestion', 'Ask question')}
                className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-[0.78rem] cursor-pointer hover:bg-blue-100 transition"
              >
                <FaHeadset />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(b._id, b.ticketNumber)}
              title={t('common.delete', 'Delete')}
              className="py-1.5 px-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg font-extrabold text-[0.78rem] cursor-pointer inline-flex items-center hover:bg-red-100 transition"
            >
              ✕
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('buses.searchPlaceholder', 'Search by ticket number, company, or route...')}
        emptyMessage={t('passenger.noBookingsRecorded', 'No booking history found. Search and book your bus tickets anytime!')}
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
            notify.success(MESSAGES.payment.success);
          }}
        />
      )}
    </div>
  );
};

export default BookingHistory;
