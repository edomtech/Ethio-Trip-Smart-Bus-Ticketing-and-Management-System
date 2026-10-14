import React, { useState, useEffect } from 'react';
import {
  FaUser, FaCalendarAlt, FaBus, FaCreditCard, FaTimes, FaPrint, FaQrcode,
  FaSearch, FaSync, FaEye, FaUsers, FaPaperPlane
} from 'react-icons/fa';
import { bookingAPI, notificationAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import TicketModal from '../../../components/TicketModal';
import { useTranslation } from '../../../i18n';

const ViewPassenger = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const companyId = user?.companyId?._id || user?.companyId;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [ticketModalBooking, setTicketModalBooking] = useState(null);

  const [sendEmailBooking, setSendEmailBooking] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      const list = Array.isArray(data) ? data : (data?.bookings || []);
      const companyBookings = companyId
        ? list.filter(b => {
            const bCompId = b.companyId?._id || b.companyId || b.schedule?.companyId?._id || b.schedule?.companyId;
            return String(bCompId) === String(companyId);
          })
        : list;

      setBookings(companyBookings);
    } catch (err) {
      toast.error(t('agent.loadPassengerFailed', 'Failed to load passenger list: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [companyId]);

  const handleSendEmail = async () => {
    if (!sendEmailBooking?.passenger?.email) {
      toast.error(t('agent.noEmailFound', 'No email address found for this passenger.'));
      return;
    }
    if (!emailMessage.trim()) {
      toast.error(t('agent.enterMessage', 'Please enter a message to send.'));
      return;
    }
    setSendingEmail(true);
    try {
      await notificationAPI.sendPassengerEmail({
        passengerEmail: sendEmailBooking.passenger.email,
        subject: emailSubject.trim() || `${t('agent.messageBooking', 'Message regarding your booking –')} ${sendEmailBooking.ticketNumber || ''}`,
        message: emailMessage.trim(),
        bookingRef: sendEmailBooking.ticketNumber || '',
      });
      toast.success(`${t('agent.emailSentTo', 'Email sent to')} ${sendEmailBooking.passenger.email}!`);
      setSendEmailBooking(null);
      setEmailSubject('');
      setEmailMessage('');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || t('ticket.sendFailed', 'Failed to send email'));
    } finally {
      setSendingEmail(false);
    }
  };

  const filtered = bookings.filter(b => {
    if (searchDate && b.schedule?.date !== searchDate) return false;

    const q = filterQuery.toLowerCase().trim();
    const nameMatch = (b.passenger?.name || '').toLowerCase().includes(q);
    const phoneMatch = (b.passenger?.phone || '').includes(q);
    const ticketMatch = (b.ticketNumber || '').toLowerCase().includes(q);
    const routeMatch = `${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`.toLowerCase().includes(q);
    const matchesQuery = !q || nameMatch || phoneMatch || ticketMatch || routeMatch;

    if (statusFilter === 'ALL') return matchesQuery;
    if (statusFilter === 'PAID') return matchesQuery && (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed');
    if (statusFilter === 'PENDING') return matchesQuery && (b.paymentStatus === 'PENDING' || b.paymentStatus === 'pending');
    if (statusFilter === 'CANCELLED') return matchesQuery && (b.status === 'CANCELLED' || b.status === 'cancelled');
    return matchesQuery;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center flex-wrap gap-3 pb-1">
        <div>
          <h2 className="m-0 mb-1 font-black text-[1.35rem] text-slate-900 flex items-center gap-2.5">
            <FaUsers className="text-eb-green" /> {t('agent.passengerDirectory', 'Passenger Directory')}
          </h2>
          <p className="m-0 text-slate-500 text-[0.85rem]">
            {t('agent.passengerDirectorySub', 'View all registered passenger bookings, travel schedules, assigned seats, and payment details.')}
          </p>
        </div>
        <button
          onClick={fetchPassengers}
          disabled={loading}
          className="py-[9px] px-[18px] bg-eb-green hover:bg-[#067328] text-white border-0 rounded-lg font-extrabold text-[0.84rem] cursor-pointer flex items-center gap-[7px] shadow-[0_2px_8px_rgba(7,137,48,0.2)] transition-colors disabled:opacity-50"
        >
          <FaSync className={loading ? 'fa-spin' : ''} /> {t('common.refreshList', 'Refresh List')}
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-slate-200 py-3.5 px-[18px] flex justify-between items-center flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border-[1.5px] border-slate-300 rounded-lg py-[7px] px-3 min-w-[240px] flex-1 max-w-[360px]">
          <FaSearch className="text-slate-400 text-[0.85rem]" />
          <input
            type="text"
            placeholder={t('agent.searchPaxPlaceholder', 'Search by passenger, phone, ticket...')}
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="border-0 bg-transparent outline-none text-[0.86rem] w-full text-slate-900"
          />
          {filterQuery && (
            <button onClick={() => setFilterQuery('')} className="bg-transparent border-0 text-slate-400 cursor-pointer p-0 hover:text-slate-600">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border-[1.5px] border-slate-300 rounded-lg py-[7px] px-3">
          <FaCalendarAlt className="text-eb-green text-[0.85rem]" />
          <span className="text-[0.74rem] font-extrabold text-slate-600 whitespace-nowrap">{t('agent.dateFilter', 'Date:')}</span>
          <input
            type="date"
            title="Filter by travel date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="border-0 bg-transparent outline-none text-[0.84rem] text-slate-900 font-bold cursor-pointer"
          />
          {searchDate && (
            <button onClick={() => setSearchDate('')} className="bg-transparent border-0 text-slate-400 cursor-pointer p-0 hover:text-slate-600">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-0.5">
          {[
            { id: 'ALL', label: `${t('common.all', 'All')} (${bookings.length})` },
            { id: 'PAID', label: t('payment.paidConfirmed', 'Paid / Confirmed') },
            { id: 'PENDING', label: t('payment.pendingHold', 'Pending Hold') },
            { id: 'CANCELLED', label: t('booking.cancelled', 'Cancelled') },
          ].map(tTab => (
            <button
              key={tTab.id}
              onClick={() => setStatusFilter(tTab.id)}
              className={`px-3 py-[5px] rounded-md border-0 text-[0.78rem] cursor-pointer transition-all ${
                statusFilter === tTab.id
                  ? 'bg-white text-eb-green font-extrabold shadow-sm'
                  : 'bg-transparent text-slate-500 font-semibold hover:text-slate-700'
              }`}
            >
              {tTab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 px-5 text-slate-500">
            <FaSync className="fa-spin text-[2rem] text-eb-green mb-3 mx-auto" />
            <p className="m-0 font-bold">{t('agent.loadingPaxDirectory', 'Loading passenger directory...')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-500">
            <FaUsers className="text-[2.5rem] text-slate-300 mb-3 mx-auto" />
            <h4 className="m-0 mb-1 text-slate-700 font-bold">{t('agent.noPaxFound', 'No Passengers Found')}</h4>
            <p className="m-0 text-[0.82rem]">
              {filterQuery ? t('agent.noMatchQuery', 'No records match your search query.') : t('agent.noPaxRegistered', 'No passenger bookings registered yet.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.85rem]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600 text-[0.74rem] uppercase tracking-wide">
                  <th className="py-3 px-[18px]">{t('passenger.passenger', 'Passenger')}</th>
                  <th className="py-3 px-[18px]">{t('forms.phone', 'Phone Number')}</th>
                  <th className="py-3 px-[18px]">{t('agent.routeAndDate', 'Route & Date')}</th>
                  <th className="py-3 px-[18px]">{t('booking.seats', 'Seat(s)')}</th>
                  <th className="py-3 px-[18px]">{t('ticket.ticketNumber', 'Ticket No')}</th>
                  <th className="py-3 px-[18px]">{t('ticket.fareStatus', 'Fare & Payment')}</th>
                  <th className="py-3 px-[18px]">{t('common.status', 'Status')}</th>
                  <th className="py-3 px-[18px] text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed');
                  const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled');
                  const seatsList = Array.isArray(b.selectedSeats) ? b.selectedSeats : [b.selectedSeats];

                  return (
                    <tr
                      key={b._id || idx}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="py-3.5 px-[18px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-[0.85rem] shrink-0">
                            {(b.passenger?.name || 'P')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{b.passenger?.name || t('passenger.passenger', 'Passenger')}</div>
                            <div className="text-[0.74rem] text-slate-500">{b.passenger?.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-[18px] font-semibold text-slate-700">
                        {b.passenger?.phone || '—'}
                      </td>

                      <td className="py-3.5 px-[18px]">
                        <div className="font-bold text-slate-900">
                          {t(b.schedule?.route?.from, b.schedule?.route?.from || 'Origin')} ➔ {t(b.schedule?.route?.to, b.schedule?.route?.to || 'Destination')}
                        </div>
                        <div className="text-[0.74rem] text-slate-500 flex gap-1.5 items-center mt-0.5">
                          <span>{b.schedule?.date || '—'}</span>
                          <span>•</span>
                          <span>{b.schedule?.departureTime || '—'}</span>
                          {b.tripType === 'round' && (
                            <span className="bg-amber-100 text-amber-800 text-[0.65rem] font-extrabold px-1 py-0.5 rounded">
                              {t('booking.roundTrip', 'Round-Trip')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-[18px]">
                        <div className="flex gap-1 flex-wrap">
                          {seatsList.map(s => (
                            <span key={s} className="bg-green-100 text-green-800 px-[7px] py-0.5 rounded font-extrabold text-[0.76rem]">
                              {t('booking.seat', 'Seat')} {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-[18px] font-mono font-extrabold text-eb-green">
                        {b.ticketNumber || '—'}
                      </td>

                      <td className="py-3.5 px-[18px]">
                        <div className="font-extrabold text-slate-900">ETB {b.totalPrice || b.baseFare || 0}</div>
                        <div className="text-[0.72rem] text-slate-500">{b.paymentMethod || 'Cash'}</div>
                      </td>

                      <td className="py-3.5 px-[18px]">
                        {isCancelled ? (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[0.72rem] font-extrabold">
                            {t('booking.cancelled', 'Cancelled')}
                          </span>
                        ) : isPaid ? (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[0.72rem] font-extrabold">
                            ✓ {t('payment.paidActive', 'Paid & Active')}
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[0.72rem] font-extrabold">
                            {t('payment.pendingHold', 'Pending (5h)')}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-[18px] text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white border-0 rounded-lg font-bold text-[0.78rem] cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                          >
                            <FaEye /> {t('common.view', 'View')}
                          </button>
                          {b.passenger?.email && (
                            <button
                              onClick={() => {
                                setSendEmailBooking(b);
                                setEmailSubject(`${t('agent.updateOnBooking', 'Update on booking')} ${b.ticketNumber || ''}`);
                                setEmailMessage('');
                              }}
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg font-bold text-[0.78rem] cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                              title={`${t('agent.sendEmailTo', 'Send email to')} ${b.passenger.email}`}
                            >
                              <FaPaperPlane /> {t('agent.email', 'Email')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedBooking && (
        <div
          onClick={() => setSelectedBooking(null)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[20px] w-full max-w-[680px] max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl border border-slate-200"
          >
            <div className="bg-gradient-to-br from-[#064e3b] to-[#065f46] py-5 px-6 flex justify-between items-center text-white shrink-0">
              <div>
                <div className="text-[0.68rem] text-white/70 font-extrabold tracking-wider uppercase">
                  {t('agent.paxProfileTitle', 'PASSENGER REGISTRATION & BOOKING PROFILE')}
                </div>
                <div className="text-[1.25rem] font-black text-white">
                  {selectedBooking.passenger?.name}
                </div>
                <div className="text-[0.78rem] text-white/85 mt-0.5">
                  {t('ticket.ticketNumber', 'Ticket No')}: <strong>{selectedBooking.ticketNumber}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="bg-white/15 hover:bg-white/25 text-white border-0 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-[18px]">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="m-0 mb-3 text-[0.85rem] font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FaUser className="text-eb-green" /> {t('booking.passengerInfo', 'Passenger Information (At Registration / Booking)')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[0.82rem]">
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('forms.fullName', 'FULL NAME')}</span>
                    <strong className="text-slate-900">{selectedBooking.passenger?.name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('forms.phone', 'PHONE NUMBER')}</span>
                    <strong className="text-slate-900">{selectedBooking.passenger?.phone || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('forms.email', 'EMAIL ADDRESS')}</span>
                    <strong className="text-slate-900">{selectedBooking.passenger?.email || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('forms.gender', 'GENDER / AGE')}</span>
                    <strong className="text-slate-900">
                      {selectedBooking.passenger?.gender || 'Male'} {selectedBooking.passenger?.age ? `· ${selectedBooking.passenger.age} yrs` : ''}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="m-0 mb-3 text-[0.85rem] font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FaBus className="text-eb-green" /> {t('agent.scheduleTripDetails', 'Schedule & Trip Details')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[0.82rem]">
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('admin.route', 'JOURNEY ROUTE')}</span>
                    <strong className="text-slate-900">
                      {t(selectedBooking.schedule?.route?.from, selectedBooking.schedule?.route?.from || 'Origin')} ➔ {t(selectedBooking.schedule?.route?.to, selectedBooking.schedule?.route?.to || 'Destination')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('conductor.dateTime', 'TRAVEL DATE & TIME')}</span>
                    <strong className="text-slate-900">
                      {selectedBooking.schedule?.date} · {selectedBooking.schedule?.departureTime}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('admin.bus', 'BUS FLEET / OPERATOR')}</span>
                    <strong className="text-slate-900">
                      Bus {selectedBooking.schedule?.bus?.busNumber || 'EB-101'} ({selectedBooking.schedule?.bus?.type || 'Luxury'}) · {selectedBooking.companyId?.companyName || 'Ethio Trip'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('booking.seats', 'ASSIGNED SEATS')}</span>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {(Array.isArray(selectedBooking.selectedSeats) ? selectedBooking.selectedSeats : [selectedBooking.selectedSeats]).map(s => (
                        <span key={s} className="bg-green-500 text-white px-[7px] py-0.5 rounded font-black text-[0.78rem]">
                          {t('booking.seat', 'Seat')} {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('booking.pickupStation', 'PICKUP STATION')}</span>
                    <span className="text-slate-700">
                      {selectedBooking.schedule?.pickupStation || selectedBooking.schedule?.route?.pickupStation || 'Main Terminal'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('booking.dropoffStation', 'DROPOFF STATION')}</span>
                    <span className="text-slate-700">
                      {selectedBooking.schedule?.dropoffStation || selectedBooking.schedule?.route?.dropoffStation || 'Arrival Terminal'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="m-0 mb-3 text-[0.85rem] font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FaCreditCard className="text-eb-green" /> {t('agent.fareSettlement', 'Fare, Discount & Payment Settlement')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[0.82rem]">
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('ticket.totalFare', 'TOTAL FARE PAID')}</span>
                    <strong className="text-green-800 text-[1.05rem]">ETB {selectedBooking.totalPrice || selectedBooking.baseFare || 0}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('payment.paymentStatus', 'PAYMENT STATUS')}</span>
                    <strong className={selectedBooking.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-700'}>
                      {selectedBooking.paymentStatus || 'PAID'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('payment.paymentMethod', 'PAYMENT METHOD')}</span>
                    <strong className="text-slate-900">{selectedBooking.paymentMethod || 'Cash'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('booking.tripType', 'BOOKING CHANNEL / TRIP TYPE')}</span>
                    <strong className="text-slate-900">
                      {selectedBooking.bookingChannel || 'Walk-In'} ({selectedBooking.tripType === 'round' ? t('booking.roundTrip', 'Round-Trip') : t('booking.oneWay', 'One-Way')})
                    </strong>
                  </div>
                  {selectedBooking.discountAmount > 0 && (
                    <div>
                      <span className="text-slate-500 text-[0.72rem] font-bold block uppercase">{t('admin.discountAmount', 'DISCOUNT APPLIED')}</span>
                      <strong className="text-green-600">
                        - ETB {selectedBooking.discountAmount} ({selectedBooking.discountCode || 'PROMO'})
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end mt-1 flex-wrap items-center">
                {(() => {
                  const isPaid = (selectedBooking.paymentStatus === 'PAID' || selectedBooking.paymentStatus === 'completed' || selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'confirmed');
                  const isCancelled = (selectedBooking.status === 'CANCELLED' || selectedBooking.status === 'cancelled' || selectedBooking.paymentStatus === 'FAILED');
                  const canViewTicket = isPaid && !isCancelled;

                  if (canViewTicket) {
                    return (
                      <button
                        type="button"
                        onClick={() => setTicketModalBooking(selectedBooking)}
                        className="py-2.5 px-5 bg-eb-green hover:bg-[#067328] text-white border-0 rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-[7px] shadow-[0_2px_8px_rgba(7,137,48,0.25)] transition-colors"
                      >
                        <FaQrcode /> {t('ticket.viewDigitalTicket', 'View Ticket & QR Code')}
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <span className={`text-[0.78rem] font-bold ${isCancelled ? 'text-red-600' : 'text-amber-600'}`}>
                        {isCancelled ? `✕ ${t('ticket.cancelledInactive', 'Booking Cancelled — Ticket Inactive')}` : `⏳ ${t('ticket.pendingInactive', 'Payment Pending — Ticket Inactive')}`}
                      </span>
                      <button
                        type="button"
                        disabled
                        className="py-2.5 px-4 bg-slate-100 text-slate-400 border border-slate-300 rounded-lg font-bold text-[0.82rem] cursor-not-allowed flex items-center gap-1.5"
                      >
                        <FaQrcode /> {t('ticket.unavailable', 'Ticket Unavailable')}
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    setSendEmailBooking(selectedBooking);
                    setEmailSubject(`${t('agent.updateOnBooking', 'Update on booking')} ${selectedBooking?.ticketNumber || ''}`);
                    setEmailMessage('');
                  }}
                  disabled={!selectedBooking?.passenger?.email}
                  className={`py-2.5 px-[18px] rounded-lg font-bold text-[0.85rem] cursor-pointer flex items-center gap-1.5 transition-colors border ${
                    selectedBooking?.passenger?.email
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                  }`}
                  title={selectedBooking?.passenger?.email ? `${t('agent.sendEmailTo', 'Send email to')} ${selectedBooking.passenger.email}` : 'No email address available'}
                >
                  <FaPaperPlane /> {t('agent.sendEmail', 'Send Email')}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-[18px] bg-white hover:bg-slate-50 text-slate-700 border-[1.5px] border-slate-300 rounded-lg font-bold text-[0.85rem] cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <FaPrint /> {t('ticket.printSummary', 'Print Summary')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ticketModalBooking && (
        <TicketModal
          booking={ticketModalBooking}
          onClose={() => setTicketModalBooking(null)}
        />
      )}

      {sendEmailBooking && (
        <div
          onClick={() => setSendEmailBooking(null)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[20px] w-full max-w-[520px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-[#064e3b] to-[#065f46] py-4 px-6 flex justify-between items-center text-white shrink-0">
              <div>
                <div className="text-[0.68rem] text-white/70 font-extrabold tracking-wider uppercase">{t('agent.sendEmailTitle', 'SEND MESSAGE VIA EMAIL')}</div>
                <div className="text-[1.1rem] font-black text-white mt-0.5 flex items-center gap-2">
                  <FaPaperPlane className="text-emerald-300" />
                  {sendEmailBooking?.passenger?.name || t('passenger.passenger', 'Passenger')}
                </div>
                <div className="text-[0.78rem] text-white/75 mt-0.5">{sendEmailBooking?.passenger?.email}</div>
              </div>
              <button
                onClick={() => setSendEmailBooking(null)}
                className="bg-white/15 hover:bg-white/25 text-white border-0 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-[0.78rem] font-extrabold text-slate-600 block mb-1.5 uppercase">{t('agent.subject', 'SUBJECT')}</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder={t('agent.emailSubjectPlaceholder', 'Email subject...')}
                  className="w-full border-[1.5px] border-slate-300 rounded-lg px-3 py-2.5 text-[0.88rem] text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[0.78rem] font-extrabold text-slate-600 block mb-1.5 uppercase">{t('agent.message', 'MESSAGE')}</label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  placeholder={`${t('agent.typeMsgTo', 'Type your message to')} ${sendEmailBooking?.passenger?.name || 'passenger'}...`}
                  rows={5}
                  className="w-full border-[1.5px] border-slate-300 rounded-lg px-3 py-2.5 text-[0.88rem] text-slate-900 outline-none focus:border-emerald-500 resize-y min-h-[100px] transition-colors"
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[0.78rem] text-emerald-800">
                <strong>{t('booking.bookingRef', 'Booking Ref')}:</strong> {sendEmailBooking?.ticketNumber || 'N/A'} &nbsp;·&nbsp;
                <strong>{t('admin.route', 'Route')}:</strong> {sendEmailBooking?.schedule?.route?.from || '—'} → {sendEmailBooking?.schedule?.route?.to || '—'}
              </div>
              <div className="flex gap-2.5 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setSendEmailBooking(null)}
                  className="py-2.5 px-5 bg-white hover:bg-slate-50 text-slate-700 border-[1.5px] border-slate-300 rounded-lg font-bold text-[0.85rem] cursor-pointer transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailMessage.trim()}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-2 shadow-[0_2px_8px_rgba(5,150,105,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane />
                  {sendingEmail ? t('common.sending', 'Sending...') : t('agent.sendEmail', 'Send Email')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPassenger;
