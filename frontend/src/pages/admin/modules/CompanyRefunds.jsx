import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaExchangeAlt } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const CompanyRefunds = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      const allBookings = Array.isArray(data) ? data : data.bookings || [];
      const refundEligible = allBookings.filter(
        (b) => b.status === 'CANCELLED' || b.status === 'cancelled' || (b.refundStatus && b.refundStatus !== 'NONE')
      );
      setRefundRequests(refundEligible);
    } catch (err) {
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleDecision = async (bookingId, decision) => {
    setProcessingId(bookingId);
    try {
      await bookingAPI.processRefundDecision(bookingId, decision);
      toast.success(`Refund request ${decision === 'APPROVED' ? 'approved and sent for payment' : 'rejected'} successfully!`);
      fetchRefunds();
    } catch (err) {
      toast.error(err.message || `Failed to ${decision.toLowerCase()} refund`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = refundRequests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.ticketNumber || '').toLowerCase().includes(q) ||
      (r.passenger?.name || '').toLowerCase().includes(q) ||
      (r.passenger?.phone || '').toLowerCase().includes(q) ||
      (r._id || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: 'Ticket No',
      render: (r) => <span style={{ fontWeight: 800, color: '#078930', fontFamily: 'monospace' }}>{r.ticketNumber || 'TKT-' + r._id?.slice(-6).toUpperCase()}</span>,
    },
    {
      header: 'Passenger',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>{r.passenger?.name || 'Passenger'}</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.passenger?.phone || r.user?.phone || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Route & Type',
      render: (r) => (
        <div>
          <span style={{ color: '#334155', fontWeight: 600, display: 'block' }}>
            {r.schedule?.route?.from || 'Origin'} ➔ {r.schedule?.route?.to || 'Destination'}
          </span>
          <span style={{
            display: 'inline-block',
            marginTop: 3,
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 4,
            background: r.tripType === 'round' ? '#fef3c7' : '#f1f5f9',
            color: r.tripType === 'round' ? '#92400e' : '#475569',
            border: `1px solid ${r.tripType === 'round' ? '#fde68a' : '#cbd5e1'}`
          }}>
            {r.tripType === 'round' ? '🔁 Round-Trip' : 'One-Way'}
          </span>
        </div>
      ),
    },
    {
      header: 'Original Fare',
      render: (r) => <span style={{ fontWeight: 600 }}>ETB {r.totalPrice}</span>,
    },
    {
      header: 'Eligible Refund',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 800, color: '#16a34a', display: 'block' }}>ETB {r.refundAmount || 0}</span>
          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>⚡ Chapa Direct</span>
        </div>
      ),
    },
    {
      header: 'Reason',
      render: (r) => <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.cancellationReason || r.refundReason || 'User requested'}</span>,
    },
    {
      header: 'Refund Status',
      render: (r) => {
        const isApproved = r.refundStatus === 'APPROVED' || r.refundStatus === 'PROCESSED';
        const isPending = r.refundStatus === 'PENDING';
        return (
          <div>
            <span className={`eb-badge ${isApproved ? 'eb-badge-active' : isPending ? 'eb-badge-pending' : 'eb-badge-inactive'}`}>
              {r.refundStatus || 'CANCELLED'}
            </span>
            {isApproved && (
              <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 800, marginTop: 2 }}>
                ✓ Disbursed
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      render: (r) => (
        <div>
          {r.refundStatus === 'PENDING' ? (
            <div className="eb-action-group">
              <button
                onClick={() => handleDecision(r._id, 'APPROVED')}
                disabled={processingId === r._id}
                className="eb-btn-action eb-btn-view"
                title="Approve & Disburse via Chapa"
                style={{ background: '#059669', color: '#fff' }}
              >
                <FaCheck /> {processingId === r._id ? 'Processing...' : 'Approve & Refund'}
              </button>
              <button
                onClick={() => handleDecision(r._id, 'REJECTED')}
                disabled={processingId === r._id}
                className="eb-btn-action eb-btn-delete"
              >
                <FaTimes /> Reject
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
              {r.refundStatus === 'APPROVED' || r.refundStatus === 'PROCESSED' ? '✓ Refunded via Chapa' : 'Closed'}
            </span>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = refundRequests.filter((r) => r.refundStatus === 'PENDING').length;
  const approvedCount = refundRequests.filter((r) => r.refundStatus === 'APPROVED' || r.refundStatus === 'PROCESSED').length;
  const rejectedCount = refundRequests.filter((r) => r.refundStatus === 'REJECTED').length;

  return (
    <div>
      <AdminPageHeader
        category="CUSTOMER SERVICE & SETTLEMENTS"
        title="Cancellation & Refund Requests"
        icon={<FaExchangeAlt />}
        subtitle="Review passenger cancellation requests, verify eligibility criteria, and approve automated Chapa refund disbursements."
        stats={[
          { label: 'Total Requests', value: refundRequests.length, color: '#0284c7' },
          { label: 'Pending Review', value: pendingCount, color: '#dc2626' },
          { label: 'Approved Refunds', value: approvedCount, color: '#16a34a' },
          { label: 'Rejected', value: rejectedCount, color: '#64748b' },
        ]}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search refunds by ticket number, passenger name, or phone..."
        emptyMessage="No cancellation or refund requests recorded for your company."
      />
    </div>
  );
};

export default CompanyRefunds;
