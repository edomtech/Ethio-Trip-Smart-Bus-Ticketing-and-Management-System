import React, { useState, useEffect } from 'react';
import {
  FaTimesCircle, FaTicketAlt, FaCheckCircle, FaExclamationTriangle,
  FaMoneyBillWave, FaClock, FaArrowRight
} from 'react-icons/fa';
import { bookingAPI, paymentAPI } from '../../../utils/api';
import { toast } from 'react-toastify';

import { useTranslation } from '../../../i18n';

const RefundStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = {
    REQUESTED:  { cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', label: `🕐 ${t('requested', 'Requested')}` },
    PENDING:    { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', label: `⏳ ${t('pending approval', 'Pending Approval')}` },
    APPROVED:   { cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800', label: `✓ ${t('approved', 'Approved')}` },
    PROCESSING: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', label: `⚡ ${t('processing', 'Processing')}` },
    REFUNDED:   { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700', label: `✅ ${t('refunded', 'Refunded')}` },
    REJECTED:   { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800', label: `✕ ${t('rejected', 'Rejected')}` },
    REVERSED:   { cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', label: t('reversed', 'Reversed') },
  };
  const s = cfg[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', label: status || '—' };
  return (
    <span className={`py-1 px-2.5 rounded-full text-[0.73rem] font-extrabold border whitespace-nowrap inline-block ${s.cls}`}>
      {s.label}
    </span>
  );
};

const CancelBooking = () => {
  const { t } = useTranslation();
  const [bookings, setBookings]           = useState([]);
  const [myRefunds, setMyRefunds]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState(null);
  const [cancelLeg, setCancelLeg]         = useState('all');
  const [reason, setReason]               = useState('');
  const [cancelling, setCancelling]       = useState(false);
  const [requesting, setRequesting]       = useState(false);
  const [selectedForRefund, setSelectedForRefund] = useState(null);
  const [refundReason, setRefundReason]   = useState('');
  const [refundLeg, setRefundLeg]         = useState('all');
  const [activeSection, setActiveSection] = useState('cancel');

  const load = async () => {
    setLoading(true);
    try {
      const [bkRes, rfRes] = await Promise.all([
        bookingAPI.getMyBookings().catch(() => []),
        paymentAPI.getMyRefunds().catch(() => []),
      ]);
      setBookings(Array.isArray(bkRes) ? bkRes : []);
      setMyRefunds(Array.isArray(rfRes) ? rfRes : []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeBookings = bookings.filter((b) => {
    const st = (b.status || '').toUpperCase();
    return st === 'CONFIRMED' || st === 'PENDING_PAYMENT' || st === 'PENDING';
  });

  const isUpToTripDay = (bk) => {
    const tripDateStr = bk.schedule?.date || bk.outboundLeg?.date || bk.travelDate || bk.date;
    if (!tripDateStr) return true;
    const tripDate = new Date(tripDateStr);
    if (isNaN(tripDate.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDayEnd = new Date(tripDate);
    tripDayEnd.setHours(23, 59, 59, 999);
    return today <= tripDayEnd;
  };

  const cancelledPaidBookings = bookings.filter((b) => {
    const st = (b.status || '').toUpperCase();
    const ps = (b.paymentStatus || '').toUpperCase();
    const isCancelled = st === 'CANCELLED';
    const isPaid = ps === 'PAID' || ps === 'COMPLETED' || ps === 'REFUND_REQUESTED';
    const alreadyHasRefund = myRefunds.some(r =>
      (r.bookingId?._id || r.bookingId) === b._id && !['REJECTED','REVERSED'].includes(r.status)
    );
    return isCancelled && isPaid && !alreadyHasRefund && isUpToTripDay(b);
  });

  const expiredRefundBookings = bookings.filter((b) => {
    const st = (b.status || '').toUpperCase();
    const ps = (b.paymentStatus || '').toUpperCase();
    const isCancelled = st === 'CANCELLED';
    const isPaid = ps === 'PAID' || ps === 'COMPLETED' || ps === 'REFUND_REQUESTED';
    const alreadyHasRefund = myRefunds.some(r =>
      (r.bookingId?._id || r.bookingId) === b._id && !['REJECTED','REVERSED'].includes(r.status)
    );
    return isCancelled && isPaid && !alreadyHasRefund && !isUpToTripDay(b);
  });

  const calculateEstimatedRefund = (bk, leg = 'all') => {
    if (!bk) return 0;
    const ps = (bk.paymentStatus || '').toUpperCase();
    if (ps !== 'PAID' && ps !== 'COMPLETED') return 0;
    const policy = bk.companyId?.cancellationPolicy || { deadlineHours: 24, refundPercentage: 80 };
    const rate = (policy.refundPercentage || 80) / 100;
    if (leg === 'return') return Math.round((bk.returnLeg?.price || bk.totalPrice / 2) * rate);
    if (leg === 'outbound') return Math.round((bk.outboundLeg?.price || bk.totalPrice / 2) * rate);
    return Math.round((bk.totalPrice || 0) * rate);
  };

  const handleCancel = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      const isPaid = ['PAID','paid','completed'].includes(selected.paymentStatus);
      const res = await bookingAPI.cancel(selected._id, reason || (isPaid ? 'Cancelled by passenger' : 'Unpaid reservation cancelled'), cancelLeg);
      if (isPaid && res?.refundAmount > 0) {
        toast.success(`Booking cancelled. Eligible refund: ETB ${res.refundAmount}. Go to "Request Refund" tab to submit.`);
      } else {
        toast.success('Reservation cancelled. Seats released.');
      }
      setSelected(null); setReason('');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Cancellation failed');
    } finally { setCancelling(false); }
  };

  const handleRequestRefund = async () => {
    if (!selectedForRefund) return;
    setRequesting(true);
    try {
      await paymentAPI.requestRefund({ bookingId: selectedForRefund._id, reason: refundReason || 'Passenger cancellation refund request', leg: refundLeg });
      toast.success('Refund request submitted! Admin will review and approve.');
      setSelectedForRefund(null); setRefundReason(''); setRefundLeg('all');
      setActiveSection('status');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to submit refund request');
    } finally { setRequesting(false); }
  };

  const tabs = [
    { id: 'cancel', label: t('cancel booking', 'Cancel Booking'), count: activeBookings.length },
    { id: 'refund', label: t('request refund', 'Request Refund'), count: cancelledPaidBookings.length },
    { id: 'status', label: t('refund status', 'Refund Status'), count: myRefunds.length },
  ];

  const cardStyle = { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, minWidth: 0 };
  const legBtns = [
    { id: 'all', label: t('full trip', 'Full Trip') },
    { id: 'outbound', label: t('outbound', 'Outbound') },
    { id: 'return', label: t('return', 'Return') }
  ];

  return (
    <div className="flex flex-col gap-4.5">


      {}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`py-2 px-4 rounded-xl border-none cursor-pointer font-bold text-[0.82rem] flex items-center gap-1.5 transition-all ${
              activeSection === tab.id
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-1.5 text-[0.7rem] font-extrabold ${
                activeSection === tab.id
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {}
      {activeSection === 'cancel' && (
        <div className="eb-refund-grid">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 min-w-0">
            <h3 className="m-0 mb-3.5 text-[0.95rem] font-extrabold text-slate-900 dark:text-white">{t('active bookings', 'Active Bookings')} ({activeBookings.length})</h3>
            {loading ? <div className="text-center p-8 text-slate-400">{t('Loading...', 'Loading...')}</div>
              : activeBookings.length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  <FaCheckCircle className="text-3xl text-emerald-600 dark:text-emerald-400 mb-2 mx-auto" />
                  <p className="font-bold m-0">{t('no active bookings.', 'No active bookings eligible for cancellation.')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {activeBookings.map((bk) => {
                    const isPaid = ['PAID','paid','completed'].includes(bk.paymentStatus);
                    const isSelected = selected?._id === bk._id;
                    return (
                      <div
                        key={bk._id}
                        onClick={() => { setSelected(bk); setCancelLeg('all'); }}
                        className={`p-3 rounded-xl cursor-pointer transition border-2 ${
                          isSelected
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8.5 h-8.5 bg-red-50 dark:bg-red-950/50 rounded-lg flex items-center justify-center text-red-600 shrink-0">
                              <FaTicketAlt />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-[0.86rem] text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                {bk.schedule?.route?.from || 'Origin'} <FaArrowRight className="text-[0.65rem] text-slate-400" /> {bk.schedule?.route?.to || 'Dest'}
                                <span className={`text-[0.63rem] py-0.5 px-1.5 rounded font-extrabold ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'}`}>{isPaid ? t('paid', 'Paid') : t('unpaid', 'Unpaid')}</span>
                              </div>
                              <div className="text-[0.71rem] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{bk.ticketNumber} · {bk.companyId?.companyName} · {bk.schedule?.date}</div>
                            </div>
                          </div>
                          <div className="font-extrabold text-[#078930] dark:text-emerald-400 text-[0.88rem] shrink-0">ETB {bk.totalPrice}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          {selected && (() => {
            const isPaid = ['PAID','paid','completed'].includes(selected.paymentStatus);
            const isRound = selected.tripType === 'round';
            const est = calculateEstimatedRefund(selected, cancelLeg);
            return (
              <div className="bg-white dark:bg-slate-900 border-2 border-red-600 rounded-2xl p-4.5 self-start">
                <h4 className="font-black text-red-800 dark:text-red-400 m-0 mb-3 text-[0.9rem] flex items-center gap-1.5">
                  <FaExclamationTriangle /> {isPaid ? t('cancel & request refund', 'Cancel & Queue Refund') : t('cancel reservation', 'Cancel Reservation')}
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 mb-3 text-[0.78rem] border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-900 dark:text-white mb-1">{selected.schedule?.route?.from} → {selected.schedule?.route?.to}</div>
                  <div className="text-slate-500 dark:text-slate-400">{t('ticket number', 'Ticket')}: <strong>{selected.ticketNumber}</strong></div>
                  <div className="text-slate-500 dark:text-slate-400">{t('Fare', 'Fare')}: ETB {selected.totalPrice}</div>
                </div>
                {isRound && (
                  <div className="mb-3">
                    <label className="text-[0.7rem] font-extrabold text-slate-700 dark:text-slate-300 block mb-1 uppercase">{t('cancel leg', 'Cancel Leg')}</label>
                    <div className="flex gap-1.5">
                      {legBtns.map(leg => (
                        <button
                          key={leg.id}
                          type="button"
                          onClick={() => setCancelLeg(leg.id)}
                          className={`flex-1 py-1 px-1 rounded-lg text-[0.7rem] font-bold cursor-pointer border ${
                            cancelLeg === leg.id
                              ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {leg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isPaid ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 mb-3">
                    <div className="text-[0.7rem] text-emerald-800 dark:text-emerald-300 font-extrabold">{t('estimated refund', 'ESTIMATED REFUND')}</div>
                    <div className="text-[1.2rem] font-black text-emerald-700 dark:text-emerald-300">ETB {est}</div>
                    <div className="text-[0.67rem] text-emerald-800 dark:text-emerald-400 mt-0.5">{t('After cancelling, use Request Refund tab to submit for admin approval.', 'After cancelling, use "Request Refund" tab to submit for admin approval.')}</div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 mb-3">
                    <div className="text-[0.72rem] text-amber-800 dark:text-amber-300 font-extrabold">{t('unpaid — no refund', 'UNPAID — No Refund')}</div>
                    <div className="text-[0.7rem] text-amber-700 dark:text-amber-400 mt-0.5">{t('seats will be released.', 'Seats will be released.')}</div>
                  </div>
                )}
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('reason (optional)', 'Reason (optional)')}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[0.8rem] box-border mb-2.5 outline-none"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className={`p-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 text-[0.83rem] transition cursor-pointer ${
                      cancelling
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-red-600 to-red-700 text-white hover:opacity-95 shadow-sm'
                    }`}
                  >
                    <FaTimesCircle /> {cancelling ? t('Processing...', 'Processing...') : (isPaid ? t('cancel & request refund', 'Cancel & Request Refund') : t('cancel reservation', 'Cancel Reservation'))}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer text-[0.78rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {t('keep reservation', 'Keep Reservation')}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {}
      {activeSection === 'refund' && (
        <div className="eb-refund-grid">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 min-w-0">
            <h3 className="m-0 mb-1 text-[0.95rem] font-extrabold text-slate-900 dark:text-white">{t('eligible for refund', 'Eligible for Refund')} ({cancelledPaidBookings.length})</h3>
            <p className="m-0 mb-3.5 text-[0.77rem] text-slate-500 dark:text-slate-400">{t('Cancelled paid bookings. Select one to submit a refund request to the company admin.', 'Cancelled paid bookings. Select one to submit a refund request to the company admin.')}</p>
            {loading ? <div className="text-center p-8 text-slate-400">{t('Loading...', 'Loading...')}</div>
              : cancelledPaidBookings.length === 0 ? (
                <div className="text-center p-9 text-slate-500">
                  <FaCheckCircle className="text-3xl text-emerald-600 dark:text-emerald-400 mb-2 mx-auto" />
                  <p className="font-bold m-0 mb-1">{t('no pending refunds.', 'No pending refunds eligible.')}</p>
                  <p className="text-[0.77rem] m-0 text-slate-400">{t('Cancel a paid booking first, or check Refund Status tab.', 'Cancel a paid booking first, or check Refund Status tab.')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {cancelledPaidBookings.map((bk) => {
                    const isSelected = selectedForRefund?._id === bk._id;
                    const est = calculateEstimatedRefund(bk, isSelected ? refundLeg : 'all');
                    return (
                      <div
                        key={bk._id}
                        onClick={() => { setSelectedForRefund(bk); setRefundLeg('all'); }}
                        className={`p-3 rounded-xl cursor-pointer transition border-2 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8.5 h-8.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                              <FaMoneyBillWave />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-[0.86rem] text-slate-900 dark:text-white">{bk.schedule?.route?.from || 'Origin'} → {bk.schedule?.route?.to || 'Dest'}</div>
                              <div className="text-[0.71rem] text-slate-500 dark:text-slate-400 mt-0.5">{bk.ticketNumber} · {bk.companyId?.companyName}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-[0.9rem]">ETB {est}</div>
                            <div className="text-[0.67rem] text-slate-500 dark:text-slate-400">{t('estimated refund', 'Est. Refund')}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {expiredRefundBookings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <FaExclamationTriangle /> Past Trip Date ({expiredRefundBookings.length})
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                  Refund requests are only functional up to the scheduled departure day. These bookings have already passed their trip date:
                </p>
                <div className="space-y-1.5 opacity-75">
                  {expiredRefundBookings.map((bk) => (
                    <div key={bk._id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs flex justify-between items-center border border-slate-200 dark:border-slate-700">
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {bk.ticketNumber} · {bk.schedule?.route?.from || 'Origin'} → {bk.schedule?.route?.to || 'Dest'}
                      </span>
                      <span className="text-[11px] text-red-500 font-bold">
                        Trip date passed ({bk.schedule?.date || 'Past date'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedForRefund && (() => {
            const isRound = selectedForRefund.tripType === 'round';
            const est = calculateEstimatedRefund(selectedForRefund, refundLeg);
            return (
              <div className="bg-white dark:bg-slate-900 border-2 border-emerald-600 rounded-2xl p-4.5 self-start">
                <h4 className="font-black text-emerald-700 dark:text-emerald-300 m-0 mb-3 text-[0.9rem] flex items-center gap-1.5">
                  <FaMoneyBillWave /> {t('submit refund request', 'Submit Refund Request')}
                </h4>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 mb-3 text-[0.78rem]">
                  <div className="font-extrabold text-slate-900 dark:text-white mb-1">{selectedForRefund.schedule?.route?.from} → {selectedForRefund.schedule?.route?.to}</div>
                  <div className="text-emerald-800 dark:text-emerald-300">{t('ticket number', 'Ticket')}: <strong>{selectedForRefund.ticketNumber}</strong></div>
                  <div className="text-emerald-800 dark:text-emerald-300">{t('Fare Paid', 'Fare Paid')}: ETB {selectedForRefund.totalPrice}</div>
                  <div className="text-emerald-800 dark:text-emerald-300">{t('Operator', 'Operator')}: {selectedForRefund.companyId?.companyName}</div>
                </div>
                {isRound && (
                  <div className="mb-3">
                    <label className="text-[0.7rem] font-extrabold text-slate-700 dark:text-slate-300 block mb-1 uppercase">{t('cancel leg', 'Refund Leg')}</label>
                    <div className="flex gap-1.5">
                      {legBtns.map(leg => (
                        <button
                          key={leg.id}
                          type="button"
                          onClick={() => setRefundLeg(leg.id)}
                          className={`flex-1 py-1 px-1 rounded-lg text-[0.7rem] font-bold cursor-pointer border ${
                            refundLeg === leg.id
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {leg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 mb-3">
                  <div className="text-[0.7rem] text-amber-800 dark:text-amber-300 font-extrabold">{t('refund amount', 'REFUND AMOUNT')}</div>
                  <div className="text-[1.3rem] font-black text-amber-600 dark:text-amber-400">ETB {est}</div>
                  <div className="text-[0.67rem] text-amber-700 dark:text-amber-400 mt-0.5">{t('Admin will review. Funds returned to original payment method.', 'Admin will review. Funds returned to original payment method.')}</div>
                </div>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder={t('reason for refund', 'Reason for refund...')}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[0.8rem] box-border resize-none mb-2.5 outline-none font-inherit"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleRequestRefund}
                    disabled={requesting}
                    className={`p-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 text-[0.83rem] transition cursor-pointer ${
                      requesting
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:opacity-95 shadow-sm'
                    }`}
                  >
                    <FaMoneyBillWave /> {requesting ? t('Processing...', 'Submitting...') : t('submit refund request', 'Submit Refund Request')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedForRefund(null)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer text-[0.78rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {t('Cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {}
      {activeSection === 'status' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 min-w-0">
          <h3 className="m-0 mb-1 text-[0.95rem] font-extrabold text-slate-900 dark:text-white">{t('my refund requests', 'My Refund Requests')} ({myRefunds.length})</h3>
          <p className="m-0 mb-3.5 text-[0.77rem] text-slate-500 dark:text-slate-400">{t('Track all your refund requests below.', 'Track all your refund requests below.')}</p>
          {loading ? <div className="text-center p-8 text-slate-400">{t('Loading...', 'Loading...')}</div>
            : myRefunds.length === 0 ? (
              <div className="text-center p-10 text-slate-500">
                <FaClock className="text-3xl text-slate-400 mb-2 mx-auto" />
                <p className="font-bold m-0 mb-1">{t('no refund requests yet.', 'No refund requests yet.')}</p>
                <p className="text-[0.77rem] m-0 text-slate-400">{t('Cancel a paid booking then submit a refund request.', 'Cancel a paid booking then submit a refund request.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.79rem] min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                      {[t('ticket number', 'Ticket No'), t('operator', 'Company'), t('refund amount', 'Amount'), t('Reason', 'Reason'), t('status', 'Status'), t('date', 'Date')].map(h => (
                        <th key={h} className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myRefunds.map((r) => (
                      <tr key={r._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-extrabold text-red-600 dark:text-red-400">{r.bookingId?.ticketNumber || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.companyId?.companyName || '—'}</td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">ETB {r.amount || 0}</td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[140px] truncate">{r.reason || 'Request'}</td>
                        <td className="py-2.5 px-3"><RefundStatusBadge status={r.status} /></td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CancelBooking;
