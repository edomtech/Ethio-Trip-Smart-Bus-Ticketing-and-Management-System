import React, { useState, useEffect } from 'react';
import {
  FaCreditCard, FaFilter, FaEye, FaEdit, FaFileDownload,
  FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaUndo, FaMoneyBillWave,
  FaMobileAlt, FaUniversity, FaSync, FaTimes, FaUser, FaRoute
} from 'react-icons/fa';
import { paymentAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const AdminPayments = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentAPI.getAll();
      setPayments(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to fetch payment transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedPayment || !newStatus) return;
    setUpdating(true);
    try {
      const res = await paymentAPI.updateStatus(selectedPayment._id, newStatus);
      toast.success(t('payment status updated successfully', 'Payment status updated successfully!'));
      setPayments((prev) => prev.map((p) => (p._id === selectedPayment._id ? res.payment : p)));
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const isPaidStatus = (status) => {
    const s = String(status || '').toUpperCase();
    return s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESSFUL';
  };

  const isPendingStatus = (status) => {
    const s = String(status || '').toUpperCase();
    return s === 'PENDING';
  };

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all') {
      const ps = String(p.status || '').toLowerCase();
      if (statusFilter === 'completed' && !isPaidStatus(p.status)) return false;
      if (statusFilter === 'pending' && !isPendingStatus(p.status)) return false;
      if (statusFilter === 'failed' && ps !== 'failed') return false;
      if (statusFilter === 'refunded' && ps !== 'refunded') return false;
    }

    if (methodFilter !== 'all') {
      const pm = String(p.method || '').toLowerCase();
      if (!pm.includes(methodFilter.toLowerCase())) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.transactionId || '').toLowerCase().includes(q) ||
      (p.user?.name || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q) ||
      (p.booking?.schedule?.route?.from || '').toLowerCase().includes(q) ||
      (p.booking?.schedule?.route?.to || '').toLowerCase().includes(q)
    );
  });

  const totalRevenue = payments
    .filter((p) => isPaidStatus(p.status))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const chapaRevenue = payments
    .filter((p) => p.method === 'Chapa' && isPaidStatus(p.status))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const successCount = payments.filter((p) => isPaidStatus(p.status)).length;
  const pendingCount = payments.filter((p) => isPendingStatus(p.status)).length;

  const columns = [
    {
      header: t('transaction ref', 'Transaction Ref'),
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block text-xs">
            {p.transactionId || 'TXN-' + p._id?.slice(-8).toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {p._id?.slice(-6).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      header: t('passenger', 'Passenger'),
      render: (p) => (
        <div>
          <div className="font-bold text-slate-900">{p.user?.name || t('passenger', 'Passenger')}</div>
          <div className="text-[0.75rem] text-slate-500">{p.user?.email || p.user?.phone || '—'}</div>
        </div>
      ),
    },
    {
      header: t('booking / route', 'Booking / Route'),
      render: (p) => (
        <div>
          {p.booking?.schedule?.route ? (
            <>
              <div className="font-bold text-slate-700">
                {t(p.booking.schedule.route.from, p.booking.schedule.route.from)} → {t(p.booking.schedule.route.to, p.booking.schedule.route.to)}
              </div>
              <div className="text-[0.75rem] text-slate-500">
                {t('seats', 'Seat(s)')}: {Array.isArray(p.booking.selectedSeats) ? p.booking.selectedSeats.join(', ') : p.booking.selectedSeats || '—'}
              </div>
            </>
          ) : (
            <span className="text-slate-400 italic">{t('direct payment', 'Direct payment')}</span>
          )}
        </div>
      ),
    },
    {
      header: t('amount', 'Amount'),
      render: (p) => (
        <span className="font-black text-emerald-700">
          ETB {Number(p.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('payment method', 'Method'),
      render: (p) => {
        const rawMethod = p.booking?.paymentMethod || p.booking?.payment?.method || p.method || p.paymentMethod || 'Telebirr';
        const methodLower = String(rawMethod).toLowerCase();
        const isChapa = methodLower.includes('chapa') || methodLower.includes('card');
        const isTelebirr = methodLower.includes('telebirr');
        const isCbe = methodLower.includes('cbe');
        const isCash = methodLower.includes('cash') || methodLower.includes('counter');

        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        let icon = <FaMobileAlt />;
        let label = 'Telebirr';

        if (isChapa) {
          badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
          icon = <FaCreditCard />;
          label = 'Chapa';
        } else if (isCbe) {
          badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
          icon = <FaUniversity />;
          label = 'CBE Birr';
        } else if (isCash) {
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
          icon = <FaMoneyBillWave />;
          label = 'Cash Counter';
        } else if (isTelebirr) {
          badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          icon = <FaMobileAlt />;
          label = 'Telebirr';
        }

        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold border ${badgeClass}`}>
            {icon} {t(label, label)}
          </span>
        );
      },
    },
    {
      header: t('date', 'Date'),
      render: (p) => (
        <span className="text-slate-500 text-[0.8rem]">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: t('common.status', 'Status'),
      render: (p) => {
        const isSuccess = isPaidStatus(p.status);
        const isPending = isPendingStatus(p.status);
        const isRefunded = String(p.status || '').toUpperCase() === 'REFUNDED';
        const displayLabel = isSuccess ? t('paid / completed', 'Paid / Completed') : t(p.status, p.status);
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold capitalize border ${
            isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
            isRefunded ? 'bg-purple-50 text-purple-700 border-purple-200' :
            'bg-red-50 text-red-600 border-red-200'
          }`}>
            {displayLabel}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (p) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setSelectedPayment(p); setIsDetailModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors"
          >
            <FaEye /> {t('common.details', 'View')}
          </button>
          <button
            onClick={() => { setSelectedPayment(p); setNewStatus(p.status); setIsEditModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors"
          >
            <FaEdit /> {t('common.edit', 'Edit')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl py-[18px] px-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center text-slate-500 text-[0.8rem] font-bold">
            <span>{t('admin.totalRevenue', 'TOTAL REVENUE')}</span>
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <FaMoneyBillWave />
            </div>
          </div>
          <div className="text-[1.4rem] font-black text-slate-900 mt-2.5">
            ETB {totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl py-[18px] px-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center text-slate-500 text-[0.8rem] font-bold">
            <span>{t('chapa revenue', 'CHAPA REVENUE')}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <FaCreditCard />
            </div>
          </div>
          <div className="text-[1.4rem] font-black text-slate-900 mt-2.5">
            ETB {chapaRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl py-[18px] px-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center text-slate-500 text-[0.8rem] font-bold">
            <span>{t('common.completed', 'COMPLETED')}</span>
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <FaCheckCircle />
            </div>
          </div>
          <div className="text-[1.4rem] font-black text-green-700 mt-2.5">
            {successCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl py-[18px] px-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center text-slate-500 text-[0.8rem] font-bold">
            <span>{t('common.pending', 'PENDING')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <FaHourglassHalf />
            </div>
          </div>
          <div className="text-[1.4rem] font-black text-amber-700 mt-2.5">
            {pendingCount}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('search payments by txref, passenger name, email, or route...', 'Search payments by TxRef, passenger name, email, or route...')}
        emptyMessage={t('no payment transactions found matching criteria', 'No payment transactions found matching the selected criteria.')}
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <a
              href="https://dashboard.chapa.co"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-blue-600 hover:bg-blue-700 text-white text-[0.85rem] font-bold shadow-xs transition-colors cursor-pointer"
              title="Open official Chapa Merchant Dashboard"
            >
              <FaCreditCard className="text-xs" /> {t('chapa dashboard', 'Chapa Dashboard')} ↗
            </a>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border-[1.5px] border-slate-200 rounded-[10px] text-[0.85rem] font-semibold text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="all">{t('all statuses', 'All Statuses')}</option>
              <option value="completed">{t('common.completed', 'Completed')}</option>
              <option value="pending">{t('common.pending', 'Pending')}</option>
              <option value="failed">{t('common.failed', 'Failed')}</option>
              <option value="refunded">{t('refunded', 'Refunded')}</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-2 px-3 border-[1.5px] border-slate-200 rounded-[10px] text-[0.85rem] font-semibold text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="all">{t('all methods', 'All Methods')}</option>
              <option value="chapa">Chapa</option>
              <option value="telebirr">Telebirr</option>
              <option value="cbe birr">CBE Birr</option>
            </select>

            <button
              onClick={fetchPayments}
              className="py-2 px-3.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-[10px] font-bold text-[0.85rem] cursor-pointer flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
            >
              <FaSync /> {t('common.refresh', 'Refresh')}
            </button>
          </div>
        }
      />

      {isDetailModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
          <div className="bg-white w-full max-w-[520px] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 py-5 px-6 text-white flex justify-between items-center">
              <div>
                <div className="text-[0.7rem] font-extrabold text-amber-300 uppercase">{t('transaction receipt', 'Transaction Receipt')}</div>
                <h3 className="m-0 text-[1.2rem] font-extrabold">{t('payment details', 'Payment Details')}</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-white/20 border-none text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-200">
                <div className="text-[0.75rem] text-slate-500 uppercase font-bold">{t('total paid', 'Total Paid')}</div>
                <div className="text-[1.6rem] font-black text-emerald-700">ETB {Number(selectedPayment.amount).toLocaleString()}</div>
                <div className="text-[0.8rem] text-slate-700 mt-1">
                  {t('payment method', 'Method')}: <strong>{selectedPayment.method}</strong> · {t('ref', 'Ref')}: <span className="font-mono font-bold">{selectedPayment.transactionId}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[0.85rem] mb-5">
                <div className="bg-white border border-slate-100 p-3 rounded-xl">
                  <div className="text-slate-500 text-[0.75rem] flex items-center gap-1"><FaUser /> {t('passenger', 'Passenger')}</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{selectedPayment.user?.name || t('passenger', 'Passenger')}</div>
                  <div className="text-[0.75rem] text-slate-500">{selectedPayment.user?.email || '—'}</div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-xl">
                  <div className="text-slate-500 text-[0.75rem] flex items-center gap-1"><FaRoute /> {t('route', 'Route')}</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">
                    {selectedPayment.booking?.schedule?.route ? `${selectedPayment.booking.schedule.route.from} → ${selectedPayment.booking.schedule.route.to}` : '—'}
                  </div>
                  <div className="text-[0.75rem] text-slate-500">
                    {t('seats', 'Seats')}: {Array.isArray(selectedPayment.booking?.selectedSeats) ? selectedPayment.booking.selectedSeats.join(', ') : selectedPayment.booking?.selectedSeats || '—'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full p-3 bg-slate-900 text-white border-none rounded-xl font-extrabold cursor-pointer hover:bg-slate-800 transition-colors"
              >
                {t('common.close', 'Close Details')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
          <div className="bg-white w-full max-w-[440px] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 py-[18px] px-6 text-white flex justify-between items-center">
              <h3 className="m-0 text-[1.1rem] font-extrabold">{t('update payment status', 'Update Payment Status')}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-white/20 border-none text-white w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6">
              <div className="mb-4">
                <label className="text-[0.8rem] font-bold text-slate-600 block mb-1.5">
                  {t('transaction reference', 'Transaction Reference')}
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedPayment.transactionId || ''}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-bold font-mono text-slate-800"
                />
              </div>

              <div className="mb-6">
                <label className="text-[0.8rem] font-bold text-slate-600 block mb-1.5">
                  {t('select status', 'Select Status')}
                </label>
                <div className="text-[0.75rem] text-slate-500 mb-2">
                  {t('completed payments verified automatically', 'Note: Completed payments are verified automatically by Chapa webhook and gateway API.')}
                </div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-3 rounded-[10px] border-[1.5px] border-emerald-600 text-[0.9rem] font-bold outline-none"
                >
                  <option value="pending">{t('common.pending', 'PENDING')}</option>
                  <option value="failed">{t('common.failed', 'FAILED')}</option>
                  <option value="refunded">{t('refunded', 'REFUNDED')}</option>
                </select>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 p-3 bg-slate-100 text-slate-500 border-none rounded-[10px] font-bold cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-[1.5] p-3 bg-emerald-600 text-white border-none rounded-[10px] font-extrabold cursor-pointer hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {updating ? t('common.saving', 'Saving...') : t('update status', 'Update Status')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
