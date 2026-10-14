import React, { useState, useEffect } from 'react';
import {
  FaExchangeAlt, FaEnvelope, FaPaperPlane, FaCheckCircle,
  FaSearch, FaSync, FaClock, FaCheck, FaTimes, FaUser
} from 'react-icons/fa';
import { bookingAPI, paymentAPI, notificationAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const StaffRefundApprovals = ({ onNavigateToMessages }) => {
  const { t } = useTranslation();
  const [approvedRefunds, setApprovedRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchApprovedRefunds = async () => {
    setLoading(true);
    setStatusMessage(null);
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

      const list = [];
      const seenBookingIds = new Set();

      for (const r of directRefunds) {
        const isApproved = r.status === 'APPROVED' || r.status === 'PROCESSED' || r.status === 'REFUNDED';
        if (!isApproved) continue;

        const bk = r.bookingId || {};
        const bkId = bk._id ? String(bk._id) : (r.bookingId ? String(r.bookingId) : '');
        if (bkId) seenBookingIds.add(bkId);

        const passengerObj = r.passengerId || bk.passenger || bk.user || {};
        const email = passengerObj.email || bk.passenger?.email || '';

        list.push({
          id: r._id,
          refundId: r._id,
          bookingId: bkId,
          ticketNumber: bk.ticketNumber || r.txRef || 'TKT-' + String(r._id).slice(-6).toUpperCase(),
          passengerName: passengerObj.name || bk.passenger?.name || 'Passenger',
          passengerEmail: email,
          passengerPhone: passengerObj.phone || bk.passenger?.phone || '—',
          route: bk.schedule?.route
            ? `${bk.schedule.route.from} → ${bk.schedule.route.to}`
            : 'Scheduled Route',
          refundAmount: r.amount || bk.refundAmount || 0,
          approvedAt: r.processedAt || r.updatedAt || r.createdAt,
          adminNote: r.adminNote || 'Approved by Administration',
          status: r.status,
          messaged: false,
        });
      }

      for (const b of rawBookings) {
        const bId = String(b._id);
        const isApprovedBooking = b.refundDecision === 'APPROVED' || b.refundStatus === 'APPROVED' || b.status === 'REFUNDED';
        if (isApprovedBooking && !seenBookingIds.has(bId)) {
          seenBookingIds.add(bId);
          const passengerObj = b.passenger || b.user || {};
          list.push({
            id: b._id,
            refundId: null,
            bookingId: bId,
            ticketNumber: b.ticketNumber || 'BK-' + bId.slice(-6).toUpperCase(),
            passengerName: passengerObj.name || 'Passenger',
            passengerEmail: passengerObj.email || '',
            passengerPhone: passengerObj.phone || '—',
            route: b.schedule?.route
              ? `${b.schedule.route.from} → ${b.schedule.route.to}`
              : 'Scheduled Route',
            refundAmount: b.refundAmount || Math.round((b.totalPrice || 0) * 0.8),
            approvedAt: b.refundDecidedAt || b.updatedAt,
            adminNote: b.refundReason || 'Approved by Administration',
            status: 'APPROVED',
            messaged: false,
          });
        }
      }

      setApprovedRefunds(list);
    } catch (err) {
      console.error('Failed to load approved refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedRefunds();
  }, []);

  const openMessageModal = (item) => {
    setSelectedItem(item);
    setEmailSubject(`Refund Approved (Ticket ${item.ticketNumber}) — Please Provide Preferred Payment Method`);
    setEmailBody(
      `Hello ${item.passengerName},\n\n` +
      `Great news! Your refund request for ticket ${item.ticketNumber} (ETB ${item.refundAmount}) has been APPROVED by the company administration.\n\n` +
      `To complete your refund disbursement, please reply to this email with your preferred payout details:\n` +
      `1. Telebirr Phone Number\n` +
      `2. Commercial Bank of Ethiopia (CBE) Account Number & Account Name\n` +
      `3. Other Bank Name, Account Number & Account Name\n\n` +
      `We will process the transfer as soon as we receive your reply.\n\n` +
      `Thank you for traveling with us,\n` +
      `Customer Support Team`
    );
    setStatusMessage(null);
  };

  const handleSendEmail = async (e) => {
    e?.preventDefault();
    if (!selectedItem) return;
    if (!selectedItem.passengerEmail) {
      setStatusMessage({ type: 'error', text: 'This passenger has no email address on record.' });
      return;
    }

    setSending(true);
    setStatusMessage(null);
    try {
      await notificationAPI.sendPassengerEmail({
        passengerEmail: selectedItem.passengerEmail.trim(),
        subject: emailSubject.trim(),
        message: emailBody.trim(),
        bookingRef: selectedItem.ticketNumber,
      });

      setApprovedRefunds((prev) =>
        prev.map((r) => (r.id === selectedItem.id ? { ...r, messaged: true } : r))
      );
      setStatusMessage({
        type: 'success',
        text: `Message successfully sent to ${selectedItem.passengerEmail}!`,
      });
      setTimeout(() => {
        setSelectedItem(null);
      }, 1500);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || err.message || 'Failed to send message to passenger email.',
      });
    } finally {
      setSending(false);
    }
  };

  const filtered = approvedRefunds.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.ticketNumber || '').toLowerCase().includes(q) ||
      (r.passengerName || '').toLowerCase().includes(q) ||
      (r.passengerEmail || '').toLowerCase().includes(q) ||
      (r.passengerPhone || '').includes(q) ||
      (r.route || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: 'Ticket & Date',
      render: (r) => (
        <div>
          <span className="font-extrabold text-emerald-600 font-mono text-sm block">
            {r.ticketNumber}
          </span>
          <span className="text-xs text-slate-400">
            Approved: {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : 'Recent'}
          </span>
        </div>
      ),
    },
    {
      header: 'Passenger Details',
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{r.passengerName}</div>
          <div className="text-xs text-slate-500 font-mono">{r.passengerEmail || 'No email registered'}</div>
          <div className="text-xs text-slate-400">{r.passengerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Route',
      render: (r) => (
        <span className="text-sm font-semibold text-slate-700">{r.route}</span>
      ),
    },
    {
      header: 'Approved Refund',
      render: (r) => (
        <div className="font-black text-emerald-600 text-base">
          ETB {Number(r.refundAmount || 0).toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Admin Status',
      render: (r) => (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            <FaCheck /> Admin Approved
          </span>
          {r.adminNote && (
            <span className="block text-[11px] text-slate-500 mt-1 italic max-w-xs truncate">
              {r.adminNote}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openMessageModal(r)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Ask passenger for refund payment method via email"
          >
            <FaEnvelope /> {r.messaged ? 'Message Sent ✓' : 'Ask Payment Method'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FaExchangeAlt className="text-emerald-600" /> Admin Refund Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View admin-approved refunds and ask passengers which payment method (Telebirr, CBE, Bank) they prefer for disbursement.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchApprovedRefunds}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
            <FaCheckCircle />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {approvedRefunds.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved by Admin
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
            <FaEnvelope />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {approvedRefunds.filter((r) => r.messaged).length}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inquired Via Email
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
            <FaClock />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {approvedRefunds.filter((r) => !r.messaged).length}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Awaiting Message
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchTerm={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by ticket number, passenger name, email, route..."
          emptyMessage="No approved refund records found."
        />
      </div>

      {}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaEnvelope className="text-emerald-600" /> Ask Passenger Payment Method
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sends an email inquiry to the passenger's registered email address.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Passenger:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedItem.passengerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Email:</span>
                <span className="font-mono font-bold text-emerald-600">{selectedItem.passengerEmail || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ticket & Refund:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedItem.ticketNumber} — ETB {selectedItem.refundAmount}
                </span>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Message Content (Passenger will receive this in email)
                </label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !selectedItem.passengerEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <FaPaperPlane /> {sending ? 'Sending Email…' : 'Send Message to Passenger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRefundApprovals;
