import React, { useState, useEffect } from 'react';
import {
  FaCheckCircle, FaEye, FaReceipt, FaSearch,
  FaUser, FaPhone, FaBus, FaCheck, FaTimes,
  FaImage, FaExclamationCircle
} from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useTranslation } from '../../../i18n';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';

const ReceiptVerification = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptImage, setSelectedReceiptImage] = useState(null);
  const [rejectionModalBooking, setRejectionModalBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getPendingReceipts();
      setReceipts(data || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.payment?.receiptReviewLoadFailed || t('payment.loadFailed', 'Failed to load receipts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleApprove = async (booking) => {
    const confirmed = await notify.confirm({
      title: t('payment.approveReceiptTitle', 'Approve Payment Receipt?'),
      message: `${t('payment.approveReceiptMsg', 'Approve the receipt for Ticket #')}${booking.ticketNumber}?`,
      description: t('payment.approveReceiptDesc', 'The active e-ticket will be issued to the passenger immediately. This action cannot be undone.'),
      confirmLabel: t('payment.approveAndIssue', 'Approve & Issue'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'success',
    });
    if (!confirmed) return;

    setProcessingId(booking._id);
    try {
      await bookingAPI.reviewReceipt(booking._id, 'APPROVE', 'Receipt approved by agent');
      setReceipts((prev) => prev.filter((r) => r._id !== booking._id));
      fetchReceipts();
    } catch (err) {
      notify.notifyError(err, MESSAGES.payment?.receiptApproveFailed || t('payment.approveFailed', 'Failed to approve receipt'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionModalBooking) return;
    setProcessingId(rejectionModalBooking._id);
    try {
      await bookingAPI.reviewReceipt(
        rejectionModalBooking._id,
        'REJECT',
        rejectionReason || 'Receipt was unreadable or payment was not verified.'
      );
      setReceipts((prev) => prev.filter((r) => r._id !== rejectionModalBooking._id));
      notify.warning(MESSAGES.payment?.receiptRejected?.(rejectionModalBooking.ticketNumber) || t('payment.receiptRejected', 'Receipt rejected'));
      setRejectionModalBooking(null);
      setRejectionReason('');
      fetchReceipts();
    } catch (err) {
      notify.notifyError(err, MESSAGES.payment?.receiptRejectFailed || t('payment.rejectFailed', 'Failed to reject receipt'));
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = receipts.filter((b) => {
    if (filterStatus === 'PENDING' && b.receiptStatus !== 'PENDING') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.ticketNumber || '').toLowerCase().includes(q) ||
      (b.passenger?.name || '').toLowerCase().includes(q) ||
      (b.passenger?.phone || '').includes(q) ||
      (b.paymentMethod || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-5 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <FaReceipt />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 m-0">
              {t('agent.receiptApprovalsTitle', 'Payment Receipt Approvals')}
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {t('agent.receiptApprovalsSub', 'Review passenger-uploaded payment receipts (Telebirr, CBE Birr) and approve to issue digital tickets.')}
            </p>
          </div>
        </div>

        <button
          onClick={fetchReceipts}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          {t('common.refreshList', 'Refresh List')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
          <input
            type="text"
            placeholder={t('agent.searchPaxReceiptPlaceholder', 'Search passenger, phone, ticket...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500">
            {t('payment.pendingApproval', 'Pending Approval')}: <strong className="text-emerald-600">{receipts.filter(r => r.receiptStatus === 'PENDING').length}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FaReceipt className="text-4xl text-slate-300 animate-pulse mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-bold">{t('payment.loadingReceipts', 'Loading payment receipts...')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
            <FaCheckCircle />
          </div>
          <h3 className="text-base font-black text-slate-900 m-0 mb-1">{t('payment.allCaughtUp', 'All Caught Up!')}</h3>
          <p className="text-xs text-slate-500 m-0">{t('payment.noPendingReceipts', 'No pending passenger payment receipts awaiting approval at this time.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">{t('ticket.ticketNumber', 'Ticket No')}</span>
                    <strong className="text-xs font-mono font-black text-slate-900">{b.ticketNumber}</strong>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                    {t('payment.awaitingApproval', 'Awaiting Approval')}
                  </span>
                </div>

                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  {b.receiptImage ? (
                    <div
                      onClick={() => setSelectedReceiptImage(b.receiptImage)}
                      className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 cursor-pointer group shrink-0 border border-slate-200"
                    >
                      <img
                        src={b.receiptImage}
                        alt="Receipt preview"
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-sm">
                        <FaEye />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl shrink-0">
                      <FaImage />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                      {b.paymentMethod || 'Telebirr'}
                    </span>
                    <div className="text-sm font-black text-slate-900">
                      ETB {Number(b.totalPrice || 0).toLocaleString()}
                    </div>
                    {b.submittedAmount && Number(b.submittedAmount) !== Number(b.totalPrice) && (
                      <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {t('payment.paid', 'Paid')}: ETB {Number(b.submittedAmount).toLocaleString()}
                      </div>
                    )}
                    {b.receiptImage && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptImage(b.receiptImage)}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FaEye className="text-[10px]" /> {t('payment.viewFullReceipt', 'View Full Receipt')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2 text-xs">
                  {b.transactionReference && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
                      <span className="text-[10px] font-black uppercase">{t('payment.txnRef', 'Txn Ref:')}</span>
                      <strong className="font-mono text-xs">{b.transactionReference}</strong>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <FaUser className="text-slate-400 shrink-0 text-[10px]" />
                    <span>{b.passenger?.name || t('passenger.passenger', 'Passenger')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <FaPhone className="text-slate-400 shrink-0 text-[10px]" />
                    <span>{b.passenger?.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 font-bold pt-1 border-t border-slate-100">
                    <FaBus className="text-emerald-600 shrink-0 text-[10px]" />
                    <span>
                      {t(b.schedule?.route?.from, b.schedule?.route?.from || 'Origin')} → {t(b.schedule?.route?.to, b.schedule?.route?.to || 'Destination')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t('conductor.date', 'Date')}: <strong>{b.schedule?.date || 'Today'}</strong></span>
                    <span>{t('booking.seats', 'Seats')}: <strong>{Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '1'}</strong></span>
                  </div>
                  {b.receiptNote && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                      "{b.receiptNote}"
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={processingId === b._id}
                  onClick={() => handleApprove(b)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                >
                  <FaCheck /> {t('common.approve', 'Approve')}
                </button>
                <button
                  type="button"
                  disabled={processingId === b._id}
                  onClick={() => {
                    setRejectionModalBooking(b);
                    setRejectionReason('');
                  }}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <FaTimes /> {t('common.reject', 'Reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceiptImage && (
        <div
          onClick={() => setSelectedReceiptImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-4 relative max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 m-0 flex items-center gap-2">
                <FaReceipt className="text-emerald-600" /> {t('payment.receiptImage', 'Payment Receipt Image')}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptImage(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto py-4 flex items-center justify-center">
              <img
                src={selectedReceiptImage}
                alt="Full receipt"
                className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {rejectionModalBooking && (
        <div
          onClick={() => setRejectionModalBooking(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
          >
            <h3 className="text-base font-black text-slate-900 m-0 mb-1 flex items-center gap-2">
              <FaExclamationCircle className="text-rose-600" /> {t('payment.rejectReceiptTitle', 'Reject Payment Receipt')}
            </h3>
            <p className="text-xs text-slate-500 m-0 mb-4">
              {t('booking.bookingRef', 'Booking #')}{rejectionModalBooking.ticketNumber} — {rejectionModalBooking.passenger?.name}
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('payment.rejectionReasonLabel', 'Reason for Rejection *')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('payment.rejectionReasonPlaceholder', 'e.g. Receipt image was unreadable, or transaction amount does not match.')}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectionModalBooking._id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {t('agent.confirmRejection', 'Confirm Rejection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptVerification;
