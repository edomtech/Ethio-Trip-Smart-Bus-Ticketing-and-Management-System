import React, { useState, useEffect } from 'react';
import {
  FaCreditCard, FaFilter, FaEye, FaEdit, FaFileDownload,
  FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaUndo, FaMoneyBillWave,
  FaMobileAlt, FaUniversity, FaSync, FaTimes, FaUser, FaRoute
} from 'react-icons/fa';
import { paymentAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modals
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
      toast.success('Payment status updated successfully!');
      setPayments((prev) => prev.map((p) => (p._id === selectedPayment._id ? res.payment : p)));
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to view the report.');
      return;
    }

    const filtered = filteredPayments;
    const totalRev = filtered.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
    const chapaRev = filtered.filter((p) => p.method === 'Chapa' && p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ethio Trip Payment & Financial Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #078930; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { margin: 0; color: #078930; font-size: 24px; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .metrics { display: flex; gap: 16px; margin-bottom: 24px; }
          .card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #078930; color: #fff; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .status { font-weight: bold; text-transform: uppercase; font-size: 10px; padding: 2px 6px; border-radius: 4px; display: inline-block; }
          .completed { background: #dcfce7; color: #15803d; }
          .pending { background: #fef3c7; color: #b45309; }
          .failed { background: #fee2e2; color: #b91c1c; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BUS COMPANY - PAYMENT TRANSACTIONS REPORT</h1>
          <p>Generated on: ${new Date().toLocaleString()} | Financial Summary</p>
        </div>
        <div class="metrics">
          <div class="card"><div class="card-title">Total Records</div><div class="card-value">${filtered.length}</div></div>
          <div class="card"><div class="card-title">Total Revenue</div><div class="card-value">ETB ${totalRev.toLocaleString()}</div></div>
          <div class="card"><div class="card-title">Chapa Revenue</div><div class="card-value">ETB ${chapaRev.toLocaleString()}</div></div>
          <div class="card"><div class="card-title">Success Rate</div><div class="card-value">${filtered.length ? Math.round((filtered.filter((p) => p.status === 'completed').length / filtered.length) * 100) : 0}%</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tx Reference</th>
              <th>Passenger</th>
              <th>Route</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p) => `
              <tr>
                <td><strong>${p.transactionId || 'N/A'}</strong></td>
                <td>${p.user?.name || 'Passenger'} (${p.user?.email || 'N/A'})</td>
                <td>${p.booking?.schedule?.route ? `${p.booking.schedule.route.from} → ${p.booking.schedule.route.to}` : 'N/A'}</td>
                <td><strong>ETB ${p.amount}</strong></td>
                <td>${p.method || 'Chapa'}</td>
                <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                <td><span class="status ${p.status}">${p.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Ethio Trip Smart Ticketing & Administration System · Official Financial Statement
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.transactionId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.booking?.schedule?.route?.from || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.booking?.schedule?.route?.to || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? p.status === 'completed' || p.status === 'successful'
        : p.status === statusFilter;

    const matchesMethod = methodFilter === 'all' ? true : p.method?.toLowerCase() === methodFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate Metrics
  const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const chapaPayments = payments.filter((p) => p.method === 'Chapa');
  const chapaRevenue = chapaPayments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const successCount = payments.filter((p) => p.status === 'completed').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const columns = [
    {
      header: 'Transaction ID',
      render: (p) => (
        <div>
          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
            {p.transactionId || 'N/A'}
          </span>
          {p.chapaRef && (
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Ref: {p.chapaRef}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Passenger',
      render: (p) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.user?.name || 'Passenger'}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.user?.email || p.user?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Booking / Route',
      render: (p) => (
        <div>
          {p.booking?.schedule?.route ? (
            <>
              <div style={{ fontWeight: 700, color: '#334155' }}>
                {p.booking.schedule.route.from} → {p.booking.schedule.route.to}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Seat(s): {Array.isArray(p.booking.selectedSeats) ? p.booking.selectedSeats.join(', ') : p.booking.selectedSeats || 'N/A'}
              </div>
            </>
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Direct payment</span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (p) => (
        <span style={{ fontWeight: 900, color: '#078930' }}>
          ETB {Number(p.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Method',
      render: (p) => (
        <span
          className="eb-badge"
          style={{
            background: p.method === 'Chapa' ? '#f3e8ff' : '#f1f5f9',
            color: p.method === 'Chapa' ? '#7e22ce' : '#334155',
            border: '1px solid #e2e8f0',
          }}
        >
          {p.method === 'Chapa' ? <FaCreditCard /> : <FaMobileAlt />} {p.method || 'Chapa'}
        </span>
      ),
    },
    {
      header: 'Date',
      render: (p) => (
        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (p) => {
        const isSuccess = p.status === 'completed' || p.status === 'successful';
        const isPending = p.status === 'pending';
        return (
          <span className={`eb-badge ${isSuccess ? 'eb-badge-active' : isPending ? 'eb-badge-pending' : 'eb-badge-inactive'}`}>
            {isSuccess ? 'Completed' : p.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (p) => (
        <div className="eb-action-group">
          <button
            onClick={() => { setSelectedPayment(p); setIsDetailModalOpen(true); }}
            className="eb-btn-action eb-btn-view"
          >
            <FaEye /> View
          </button>
          <button
            onClick={() => { setSelectedPayment(p); setNewStatus(p.status); setIsEditModalOpen(true); }}
            className="eb-btn-action eb-btn-edit"
          >
            <FaEdit /> Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        category="FINANCIAL & REVENUE MANAGEMENT"
        title="Chapa & Online Payments"
        icon={<FaCreditCard />}
        subtitle="Monitor digital transactions, CBE Birr / Telebirr / Chapa gateways, passenger receipts, and financial statements."
        stats={[
          { label: 'Total Revenue', value: `ETB ${totalRevenue.toLocaleString()}`, color: '#16a34a' },
          { label: 'Completed', value: successCount, color: '#0284c7' },
          { label: 'Pending', value: pendingCount, color: '#d97706' },
          { label: 'Chapa Revenue', value: `ETB ${chapaRevenue.toLocaleString()}`, color: '#7c3aed' },
        ]}
        actions={
          <button onClick={handleGenerateReport} className="eb-btn-primary-header">
            <FaFileDownload /> Export Statement
          </button>
        }
      />

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TOTAL REVENUE</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaMoneyBillWave />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ETB {totalRevenue.toLocaleString()}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>CHAPA REVENUE</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCreditCard />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ETB {chapaRevenue.toLocaleString()}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>COMPLETED</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCheckCircle />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '10px' }}>
            {successCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>PENDING</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaHourglassHalf />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '10px' }}>
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Filters Toolbar & DataTable */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payments by TxRef, passenger name, email, or route..."
        emptyMessage="No payment transactions found matching the selected criteria."
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
            >
              <option value="all">All Methods</option>
              <option value="chapa">Chapa</option>
              <option value="telebirr">Telebirr</option>
              <option value="cbe birr">CBE Birr</option>
            </select>

            <button
              onClick={fetchPayments}
              style={{
                padding: '8px 14px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FaSync /> Refresh
            </button>
          </div>
        }
      />

      {/* ══ VIEW DETAILS MODAL ══ */}
      {isDetailModalOpen && selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '520px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg,#078930,#045a1f)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FCDD09', textTransform: 'uppercase' }}>Transaction Receipt</div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Payment Details</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#078930' }}>ETB {Number(selectedPayment.amount).toLocaleString()}</div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '4px' }}>
                  Method: <strong>{selectedPayment.method}</strong> · Ref: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedPayment.transactionId}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><FaUser /> Passenger</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedPayment.user?.name || 'Passenger'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedPayment.user?.email || 'N/A'}</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><FaRoute /> Route</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {selectedPayment.booking?.schedule?.route ? `${selectedPayment.booking.schedule.route.from} → ${selectedPayment.booking.schedule.route.to}` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Seats: {Array.isArray(selectedPayment.booking?.selectedSeats) ? selectedPayment.booking.selectedSeats.join(', ') : selectedPayment.booking?.selectedSeats || 'N/A'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT STATUS MODAL ══ */}
      {isEditModalOpen && selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '440px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#0f172a', padding: '18px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Update Payment Status</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Transaction Reference
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedPayment.transactionId || ''}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Select Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #078930', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                >
                  <option value="completed">Completed / Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{ flex: 1.5, padding: '12px', background: '#078930', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {updating ? 'Saving...' : 'Update Status'}
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
