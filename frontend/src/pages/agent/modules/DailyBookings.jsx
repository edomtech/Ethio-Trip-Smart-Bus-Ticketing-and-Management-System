import React, { useState, useEffect } from 'react';
import { FaCalendarDay, FaCalendarAlt } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import {
  isPaid as isPaidBooking,
  isConfirmed as isConfirmedBooking,
  isCancelled as isCancelledBooking,
  isAwaitingPayment as isAwaitingPaymentBooking,
} from '../../../utils/bookingStatus';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const DailyBookings = () => {
  const { t } = useTranslation();
  const [dailyBookings, setDailyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => { fetchDaily(); }, []);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setDailyBookings(data || []);
    } catch {
      toast.error(t('agent.loadFailed', 'Failed to load daily bookings'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = dailyBookings.filter((b) => {
    if (searchDate && b.schedule?.date !== searchDate) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.ticketNumber || '').toLowerCase().includes(q) ||
      (b.passenger?.name || '').toLowerCase().includes(q) ||
      (b.passenger?.phone || '').includes(q) ||
      (`${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`).toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: t('ticket.ticketNumber', 'Ticket No'),
      render: (b) => (
        <span className="text-eb-green font-mono font-extrabold">
          {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: t('passenger.passenger', 'Passenger'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">{b.passenger?.name || t('passenger.passenger', 'Passenger')}</div>
          <div className="text-xs text-slate-500">{b.passenger?.phone || '—'}</div>
        </div>
      ),
    },
    {
      header: t('admin.route', 'Route & Departure'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">
            {t(b.schedule?.route?.from, b.schedule?.route?.from || 'Origin')} → {t(b.schedule?.route?.to, b.schedule?.route?.to || 'Destination')}
          </div>
          <span className="text-xs text-slate-500">
            ⏱ {b.schedule?.departureTime || '08:00 AM'}
          </span>
        </div>
      ),
    },
    {
      header: t('booking.seats', 'Seat No'),
      render: (b) => (
        <span className="eb-badge eb-badge-vip bg-sky-100 text-sky-600">
          {Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '01'}
        </span>
      ),
    },
    {
      header: t('booking.tripType', 'Trip Type'),
      render: (b) => (
        <span className={`text-[0.68rem] font-extrabold px-1.5 py-0.5 rounded border ${
          b.tripType === 'round'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {b.tripType === 'round' ? `🔁 ${t('booking.roundTrip', 'Round')}` : t('booking.oneWay', 'One-Way')}
        </span>
      ),
    },
    {
      header: t('booking.boardingStatus', 'Boarding Status'),
      render: (b) => {
        const isBrd = b.boardingStatus === 'BOARDED' || b.isBoarded;
        const isPart = b.boardingStatus === 'PARTIALLY_BOARDED';
        const paid = isPaidBooking(b);
        const cancelled = isCancelledBooking(b);

        if (cancelled) return <span className="text-red-500 text-[0.72rem] font-bold">{t('booking.cancelled', 'Cancelled')}</span>;
        if (!paid) return <span className="text-slate-400 text-[0.72rem] italic">{t('payment.unpaid', 'Unpaid')}</span>;

        return (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.72rem] font-extrabold border ${
            isBrd
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : isPart
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-slate-50 text-slate-500 border-slate-300'
          }`}>
            {isBrd ? `✓ ${t('booking.boarded', 'BOARDED')}` : isPart ? `⏳ ${t('booking.partial', 'PARTIAL')}` : `○ ${t('booking.notBoarded', 'NOT BOARDED')}`}
          </span>
        );
      },
    },
    {
      header: t('common.status', 'Status'),
      render: (b) => {
        const cancelled = isCancelledBooking(b);
        const confirmed = !cancelled && isConfirmedBooking(b);
        const label = cancelled ? t('booking.cancelled', 'Cancelled') : confirmed ? t('booking.confirmed', 'Confirmed') : t('booking.pending', 'Pending');
        return (
          <span className={`eb-badge ${confirmed ? 'eb-badge-active' : 'eb-badge-pending'}`}>
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="mod-wrapper">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="m-0 text-[1.35rem] font-black text-slate-900 flex items-center gap-2.5">
            <FaCalendarDay className="text-eb-green" /> {t('agent.dailyManifest', 'Daily Departure Manifest')}
          </h2>
          <p className="mt-1 mb-0 text-[0.84rem] text-slate-500">
            {t('agent.dailyManifestSub', 'Passenger list, trip type & live boarding status for departures')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shrink-0">
            🚌
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {dailyBookings.length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              {t('booking.totalBookings', 'Total Bookings')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl shrink-0">
            ✓
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {dailyBookings.filter((b) => b.boardingStatus === 'BOARDED' || b.isBoarded).length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              {t('booking.boarded', 'Boarded')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
            ○
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {dailyBookings.filter((b) => isConfirmedBooking(b) && !b.isBoarded && b.boardingStatus !== 'BOARDED').length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              {t('booking.awaitingBoarding', 'Awaiting Boarding')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl shrink-0">
            ⏳
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {dailyBookings.filter(isAwaitingPaymentBooking).length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              {t('payment.pending', 'Awaiting Payment')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border-[1.5px] border-slate-300 rounded-[10px] py-1.5 px-3.5 shadow-sm">
          <FaCalendarAlt className="text-eb-green text-[0.9rem]" />
          <span className="text-[0.78rem] font-extrabold text-slate-600">{t('agent.searchDepDate', 'Search Departure Date:')}</span>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="border-none bg-transparent outline-none font-bold text-[0.85rem] text-slate-900 cursor-pointer"
          />
          {searchDate && (
            <button
              type="button"
              onClick={() => setSearchDate('')}
              className="bg-slate-100 border-none rounded text-slate-500 cursor-pointer px-1.5 py-0.5 text-[0.72rem] font-extrabold hover:bg-slate-200 transition-colors"
            >
              {t('common.clear', 'Clear')}
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('agent.searchManifestPlaceholder', 'Search manifest by ticket number, passenger name, phone...')}
        emptyMessage={t('agent.noManifestBookings', 'No departure bookings recorded for today.')}
      />
    </div>
  );
};

export default DailyBookings;
