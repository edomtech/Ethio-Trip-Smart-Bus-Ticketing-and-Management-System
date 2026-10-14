import React, { useState, useEffect } from 'react';
import {
  FaCheck, FaTimes, FaExchangeAlt, FaSync, FaShieldAlt,
  FaCheckCircle, FaExclamationCircle, FaCommentAlt, FaInfoCircle,
  FaEye, FaBus, FaTicketAlt, FaMoneyBillWave, FaUser, FaCalendarAlt
} from 'react-icons/fa';
import { bookingAPI, paymentAPI, notificationAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';

import { useTranslation } from '../../../i18n';

const formatPaymentMethod = (method) => {
  if (!method) return 'Digital Payment';
  const m = String(method).toLowerCase();
  if (m.includes('telebirr')) return 'Telebirr';
  if (m.includes('cbe')) return 'CBE Birr / Bank Transfer';
  if (m.includes('cash')) return 'Cash / Counter';
  if (m.includes('chapa')) return 'Chapa Gateway';
  return method.toUpperCase();
};

const CompanyRefunds = () => {
  const { t } = useTranslation();
  const [refundItems, setRefundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);  
  const [viewModalItem, setViewModalItem] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const [refundsRes, bookingsRes] = await Promise.allSettled([
        paymentAPI.getRefunds(),
        bookingAPI.getAll(),
      ]);

      const directRefunds = refundsRes.status === 'fulfilled' && Array.isArray(refundsRes.value)
        ? refundsRes.value
        : [];

      const rawBookings = bookingsRes.status === 'fulfilled'
        ? (Array.isArray(bookingsRes.value) ? bookingsRes.value : bookingsRes.value?.bookings || [])
        : [];

      const combined = [];
      const seenBookingIds = new Set();

      for (const r of directRefunds) {
        const bk = r.bookingId || {};
        const bkId = bk._id ? String(bk._id) : (r.bookingId ? String(r.bookingId) : '');
        if (bkId) seenBookingIds.add(bkId);

        const passengerObj = r.passengerId || bk.passenger || bk.user || {};

        combined.push({
          id: r._id,
          refundId: r._id,
          bookingId: bkId,
          ticketNumber: bk.ticketNumber || r.txRef || 'TKT-' + String(r._id).slice(-6).toUpperCase(),
          passenger: {
            name: passengerObj.name || 'Passenger',
            email: passengerObj.email || '',
            phone: passengerObj.phone || '—',
          },
          route: bk.schedule?.route
            ? `${bk.schedule.route.from} ➔ ${bk.schedule.route.to}`
            : 'Scheduled Route',
          departureDate: bk.schedule?.date || '',
          departureTime: bk.schedule?.departureTime || '08:00 AM',
          seats: bk.selectedSeats || [],
          tripType: bk.tripType || (r.leg && r.leg !== 'all' ? r.leg : 'oneway'),
          originalFare: bk.totalPrice || r.paymentId?.amount || r.amount || 0,
          refundAmount: r.amount || bk.refundAmount || 0,
          paymentStatus: bk.paymentStatus || r.paymentId?.status || 'PAID',
          paymentMethod: bk.paymentMethod || 'chapa',
          reason: r.reason || bk.cancellationReason || bk.refundReason || 'Passenger refund request',
          status: (r.status === 'REQUESTED' ? 'PENDING' : r.status) || bk.refundStatus || 'PENDING',
          rawStatus: r.status,
          date: r.requestedAt || r.createdAt,
          adminNote: r.adminNote || '',
          source: 'refund_record',
        });
      }

      for (const b of rawBookings) {
        const bId = String(b._id);
        const hasRefundStatus = b.refundStatus && b.refundStatus !== 'NONE';
        const isCancelledPaid = (b.status === 'CANCELLED' || b.status === 'cancelled') &&
          (b.paymentStatus === 'PAID' || b.paymentStatus === 'REFUND_REQUESTED' || b.refundAmount > 0);

        if ((hasRefundStatus || isCancelledPaid) && !seenBookingIds.has(bId)) {
          seenBookingIds.add(bId);
          const passengerObj = b.passenger || b.user || {};
          combined.push({
            id: b._id,
            refundId: null,
            bookingId: bId,
            ticketNumber: b.ticketNumber || 'BK-' + bId.slice(-6).toUpperCase(),
            passenger: {
              name: passengerObj.name || 'Passenger',
              email: passengerObj.email || '',
              phone: passengerObj.phone || '—',
            },
            route: b.schedule?.route
              ? `${b.schedule.route.from} ➔ ${b.schedule.route.to}`
              : 'Scheduled Route',
            departureDate: b.schedule?.date || '',
            departureTime: b.schedule?.departureTime || '08:00 AM',
            seats: b.selectedSeats || [],
            tripType: b.tripType || 'oneway',
            originalFare: b.totalPrice || 0,
            refundAmount: b.refundAmount || Math.round((b.totalPrice || 0) * 0.8),
            paymentStatus: b.paymentStatus || 'PAID',
            paymentMethod: b.paymentMethod || 'chapa',
            reason: b.cancellationReason || b.refundReason || 'Cancellation refund request',
            status: b.refundStatus || (b.paymentStatus === 'REFUNDED' ? 'APPROVED' : 'PENDING'),
            rawStatus: b.refundStatus,
            date: b.cancelledAt || b.createdAt,
            adminNote: '',
            source: 'booking_record',
          });
        }
      }

      setRefundItems(combined);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const openDecisionModal = (item, decision) => {
    setModalAction({ item, decision });
    setAdminNote(decision === 'APPROVED' ? 'Refund approved and disbursed.' : 'Refund rejected according to policy.');
  };

  const handleConfirmDecision = async () => {
    if (!modalAction) return;
    const { item, decision } = modalAction;
    setProcessingId(item.id);

    try {
      if (item.refundId) {
        try {
          await paymentAPI.refundDecision(item.refundId, decision, adminNote);
        } catch (err) {
          console.warn('Direct refund decision note:', err.message);
        }
      }

      if (item.bookingId) {
        await bookingAPI.processRefundDecision(item.bookingId, decision, item.refundAmount, adminNote);
      }

      toast.success(
        `Refund request ${decision === 'APPROVED' ? 'approved and sent for disbursement' : 'rejected'} successfully!`
      );
      setModalAction(null);
      setAdminNote('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || `Failed to ${decision.toLowerCase()} refund`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerify = async (refundId) => {
    if (!refundId) return;
    setProcessingId(refundId);
    try {
      const res = await paymentAPI.verifyRefund(refundId);
      toast.info(`Gateway Status: ${res.chapaStatus || 'Checked'}`);
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = refundItems.filter((r) => {
    if (statusFilter === 'PENDING' && !(r.status === 'PENDING' || r.status === 'REQUESTED')) return false;
    if (statusFilter === 'APPROVED' && !(r.status === 'APPROVED' || r.status === 'PROCESSED' || r.status === 'REFUNDED')) return false;
    if (statusFilter === 'REJECTED' && r.status !== 'REJECTED') return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.ticketNumber || '').toLowerCase().includes(q) ||
      (r.passenger?.name || '').toLowerCase().includes(q) ||
      (r.passenger?.phone || '').toLowerCase().includes(q) ||
      (r.route || '').toLowerCase().includes(q) ||
      (r.reason || '').toLowerCase().includes(q)
    );
  });

  const pendingCount = refundItems.filter((r) => r.status === 'PENDING' || r.status === 'REQUESTED').length;
  const approvedCount = refundItems.filter((r) => r.status === 'APPROVED' || r.status === 'PROCESSED' || r.status === 'REFUNDED').length;
  const rejectedCount = refundItems.filter((r) => r.status === 'REJECTED').length;

  const columns = [
    {
      header: t('ticket number', 'Ticket No'),
      render: (r) => (
        <div>
          <span className="font-extrabold text-red-600 font-mono text-[0.82rem]">
            {r.ticketNumber}
          </span>
          <span className="block text-[0.67rem] text-slate-400">
            {r.date ? new Date(r.date).toLocaleDateString() : t('Recent', 'Recent')}
          </span>
        </div>
      ),
    },
    {
      header: t('passenger details', 'Passenger Details'),
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 block text-[0.82rem]">
            {r.passenger?.name || t('Passenger', 'Passenger')}
          </span>
          <span className="text-[0.72rem] text-slate-500">
            {r.passenger?.phone || r.passenger?.email || '—'}
          </span>
        </div>
      ),
    },
    {
      header: t('route & type', 'Route & Type'),
      render: (r) => (
        <div>
          <span className="text-slate-700 font-semibold block text-[0.8rem]">
            {r.route}
          </span>
          <span
            className={`inline-block mt-0.5 text-[0.65rem] font-extrabold py-px px-1.5 rounded border ${
              r.tripType === 'round' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            {r.tripType === 'round' ? `🔁 ${t('Round-Trip', 'Round-Trip')}` : t('One-Way', 'One-Way')}
          </span>
        </div>
      ),
    },
    {
      header: t('fare & refund', 'Fare & Refund'),
      render: (r) => (
        <div>
          <div className="text-[0.72rem] text-slate-500">
            {t('Fare', 'Fare')}: ETB {r.originalFare}
          </div>
          <div className="font-black text-green-600 text-[0.9rem]">
            ETB {r.refundAmount}
          </div>
        </div>
      ),
    },
    {
      header: 'Reason',
      render: (r) => (
        <div className="max-w-[160px]">
          <span className="text-[0.74rem] text-slate-600 line-clamp-2">
            {r.reason}
          </span>
          {r.adminNote && (
            <span className="text-[0.67rem] text-blue-600 block mt-0.5 italic">
              Note: {r.adminNote}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (r) => {
        const isApproved = r.status === 'APPROVED' || r.status === 'PROCESSED' || r.status === 'REFUNDED';
        const isPending = r.status === 'PENDING' || r.status === 'REQUESTED';
        const isRejected = r.status === 'REJECTED';

        return (
          <div>
            <span
              className={`py-[3px] px-2 rounded-full text-[0.7rem] font-extrabold inline-flex items-center gap-1 border ${
                isApproved
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : isPending
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : isRejected
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isApproved ? '✓ Approved' : isPending ? '⏳ Pending Review' : isRejected ? '✕ Rejected' : r.status}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      render: (r) => {
        const isPending = r.status === 'PENDING' || r.status === 'REQUESTED';
        const isProcessing = processingId === r.id;

        if (isPending) {
          return (
            <div className="flex gap-1.5 items-center flex-wrap">
              <button
                type="button"
                onClick={() => setViewModalItem(r)}
                className="py-1 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded text-[0.74rem] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                title="View Booking & Payment Details"
              >
                <FaEye /> View
              </button>
              <button
                type="button"
                onClick={() => openDecisionModal(r, 'APPROVED')}
                disabled={isProcessing}
                className="py-1 px-2.5 bg-green-600 hover:bg-green-700 text-white border-none rounded text-[0.74rem] font-extrabold cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Approve Refund"
              >
                <FaCheck /> Approve
              </button>
              <button
                type="button"
                onClick={() => openDecisionModal(r, 'REJECTED')}
                disabled={isProcessing}
                className="py-1 px-2 bg-red-100 hover:bg-red-200 text-red-600 border border-red-300 rounded text-[0.74rem] font-bold cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Reject Refund"
              >
                <FaTimes /> Reject
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewModalItem(r)}
              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[0.74rem] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
              title="View Booking & Payment Details"
            >
              <FaEye /> View
            </button>
            <span className={`text-[0.72rem] font-bold ${r.status === 'REJECTED' ? 'text-red-500' : 'text-green-600'}`}>
              {r.status === 'REJECTED' ? '✕ Rejected' : '✓ Processed'}
            </span>
            {r.refundId && (r.status === 'APPROVED' || r.status === 'PROCESSING') && (
              <button
                type="button"
                onClick={() => handleVerify(r.refundId)}
                title="Verify Status with Gateway"
                className="bg-transparent border border-slate-300 rounded px-1.5 py-[3px] text-slate-600 cursor-pointer text-[0.68rem] hover:bg-slate-50 transition-colors"
              >
                <FaSync />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-[18px]">


      {}
      <div className="flex gap-2 items-center flex-wrap">
        {[
          { id: 'ALL', label: 'All Requests', count: refundItems.length },
          { id: 'PENDING', label: 'Pending Review', count: pendingCount, color: '#dc2626' },
          { id: 'APPROVED', label: 'Approved', count: approvedCount, color: '#16a34a' },
          { id: 'REJECTED', label: 'Rejected', count: rejectedCount, color: '#64748b' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`py-1.5 px-3.5 rounded-lg border-[1.5px] text-[0.78rem] font-extrabold cursor-pointer inline-flex items-center gap-1.5 transition-all ${
              statusFilter === tab.id ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span
              className={`text-[0.68rem] py-px px-1.5 rounded-full font-extrabold ${
                statusFilter === tab.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={fetchRefunds}
          disabled={loading}
          className="ml-auto py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-[0.78rem] font-bold text-slate-600 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {}
      <div className="bg-white rounded-[14px] border border-slate-200 p-[18px]">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchTerm={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by ticket number, passenger name, phone, or route..."
          emptyMessage="No refund requests match your current filters."
        />
      </div>

      {}
      {modalAction && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-[460px] w-full p-[22px] shadow-2xl">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div
                className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center text-[1.1rem] ${
                  modalAction.decision === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {modalAction.decision === 'APPROVED' ? <FaCheckCircle /> : <FaExclamationCircle />}
              </div>
              <div>
                <h3 className="m-0 text-[1rem] font-extrabold text-slate-900">
                  {modalAction.decision === 'APPROVED' ? 'Approve Refund Request' : 'Reject Refund Request'}
                </h3>
                <p className="m-0 text-[0.75rem] text-slate-500">
                  Ticket: <strong>{modalAction.item.ticketNumber}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-3 mb-3.5 text-[0.8rem]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Passenger:</span>
                <span className="font-bold text-slate-900">{modalAction.item.passenger?.name || 'Passenger'}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Route:</span>
                <span className="font-semibold text-slate-700">{modalAction.item.route}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Original Paid:</span>
                <span className="font-semibold text-slate-800">ETB {modalAction.item.originalFare}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200">
                <span className="font-extrabold text-slate-900">Eligible Refund:</span>
                <span className={`font-black text-[0.95rem] ${modalAction.decision === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                  ETB {modalAction.item.refundAmount}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[0.75rem] font-bold text-slate-700 mb-1.5">
                Admin Note / Resolution Comment:
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Enter feedback or explanation for the passenger..."
                className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-[0.82rem] resize-none outline-none focus:border-slate-500 box-border"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setModalAction(null); setAdminNote(''); }}
                className="py-2 px-3.5 bg-slate-100 text-slate-600 border-none rounded-lg text-[0.8rem] font-bold cursor-pointer hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={processingId === modalAction.item.id}
                className={`py-2 px-4.5 text-white border-none rounded-lg text-[0.8rem] font-extrabold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  modalAction.decision === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingId === modalAction.item.id ? 'Processing...' : (modalAction.decision === 'APPROVED' ? 'Confirm Approval & Disburse' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {viewModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-[520px] w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg">
                  <FaTicketAlt />
                </div>
                <div>
                  <h3 className="m-0 text-base font-extrabold text-slate-900">
                    Passenger Booking & Payment Details
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Ticket: {viewModalItem.ticketNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FaUser /> Passenger Information
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{viewModalItem.passenger?.name || 'Passenger'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-800">{viewModalItem.passenger?.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{viewModalItem.passenger?.email || '—'}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FaBus /> Trip & Booking Information
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Route:</span>
                  <span className="font-bold text-slate-900">{viewModalItem.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Departure:</span>
                  <span className="font-semibold text-slate-800">
                    {viewModalItem.departureDate || 'Scheduled date'} at {viewModalItem.departureTime || 'Scheduled time'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seat(s):</span>
                  <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {Array.isArray(viewModalItem.seats) && viewModalItem.seats.length > 0 ? viewModalItem.seats.join(', ') : 'Assigned Seat'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trip Type:</span>
                  <span className="font-semibold text-slate-700 uppercase">{viewModalItem.tripType || 'One-Way'}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FaMoneyBillWave /> Payment & Refund Status
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {viewModalItem.paymentStatus || 'PAID'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-900">
                    {formatPaymentMethod(viewModalItem.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Total Fare:</span>
                  <span className="font-bold text-slate-900">ETB {Number(viewModalItem.originalFare || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-extrabold text-slate-900">Refund Amount Requested:</span>
                  <span className="font-black text-emerald-600 text-sm">ETB {Number(viewModalItem.refundAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Reason:</span>
                  <span className="font-medium text-slate-700 max-w-xs text-right">{viewModalItem.reason || 'Passenger Cancellation'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-slate-200">
              {(viewModalItem.status === 'PENDING' || viewModalItem.status === 'REQUESTED') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const item = viewModalItem;
                      setViewModalItem(null);
                      openDecisionModal(item, 'APPROVED');
                    }}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition"
                  >
                    <FaCheck /> Approve Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = viewModalItem;
                      setViewModalItem(null);
                      openDecisionModal(item, 'REJECTED');
                    }}
                    className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition"
                  >
                    <FaTimes /> Reject
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewModalItem(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRefunds;
