import React, { useState, useEffect } from 'react';
import { conductorReportAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  FaClipboardList, FaCheckCircle, FaHourglassHalf, FaTimesCircle,
  FaSearch, FaFilter, FaBus, FaUser, FaTicketAlt, FaRoute, FaSync
} from 'react-icons/fa';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const AdminConductorReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await conductorReportAPI.getAll();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching conductor reports:', err);
      toast.error('Failed to load conductor problem reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId, newStatus) => {
    setUpdating(true);
    try {
      await conductorReportAPI.updateStatus(reportId, newStatus, resolutionNotes.trim() || undefined);
      toast.success(`Report status updated to ${newStatus}`);
      setSelectedReport(null);
      setResolutionNotes('');
      fetchReports();
    } catch (err) {
      toast.error(err.message || 'Failed to update report status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch =
      !searchQuery ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.conductorId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tripId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const newCount = reports.filter((r) => r.status === 'OPEN').length;
  const underReviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length;

  return (
    <div>
      <AdminPageHeader
        category="FIELD OPERATIONS & LOGS"
        title="Conductor Problem Reports"
        icon={<FaClipboardList />}
        subtitle="Review and resolve operational anomalies, fare irregularities, ticket disputes, and passenger incidents reported by active conductors."
        stats={[
          { label: 'Total Reports', value: reports.length, color: '#0284c7' },
          { label: 'New Issues', value: newCount, color: '#dc2626' },
          { label: 'Under Review', value: underReviewCount, color: '#d97706' },
          { label: 'Resolved / Closed', value: resolvedCount, color: '#16a34a' },
        ]}
        actions={
          <button onClick={fetchReports} className="eb-btn-secondary-header">
            <FaSync className={loading ? 'fa-spin' : ''} /> Refresh Logs
          </button>
        }
      />

      {/* Reports Table */}
      <DataTable
        columns={[
          {
            header: 'Date / Time',
            render: (r) => (
              <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                {new Date(r.createdAt).toLocaleString()}
              </span>
            ),
          },
          {
            header: 'Conductor',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.conductorId?.name || 'Conductor'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.conductorId?.phone || r.conductorId?.email}</div>
              </div>
            ),
          },
          {
            header: 'Category & Trip',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 800, color: '#2563eb' }}>{r.category}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {r.tripId ? `Trip: ${r.tripId}` : ''} {r.busId?.busNumber ? `• Bus: ${r.busId.busNumber}` : ''}
                </div>
              </div>
            ),
          },
          {
            header: 'Passenger / Ticket',
            render: (r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.passengerName || '—'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.ticketNumber || '—'}</div>
              </div>
            ),
          },
          {
            header: 'Description',
            render: (r) => (
              <div style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                {r.description}
              </div>
            ),
          },
          {
            header: 'Status',
            render: (r) => {
              const isOpen = r.status === 'OPEN';
              const isReview = r.status === 'UNDER_REVIEW';
              const isResolved = r.status === 'RESOLVED' || r.status === 'CLOSED';
              return (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: isOpen ? '#fef2f2' : isReview ? '#fffbeb' : '#f0fdf4',
                    color: isOpen ? '#dc2626' : isReview ? '#d97706' : '#16a34a',
                    border: `1px solid ${isOpen ? '#fecaca' : isReview ? '#fde68a' : '#bbf7d0'}`,
                  }}
                >
                  {r.status}
                </span>
              );
            },
          },
          {
            header: 'Action',
            render: (r) => (
              <button
                onClick={() => {
                  setSelectedReport(r);
                  setResolutionNotes(r.resolutionNotes || '');
                }}
                style={{
                  padding: '6px 12px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Inspect & Resolve
              </button>
            ),
          },
        ]}
        data={filteredReports}
        loading={loading}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search category, conductor, passenger, ticket..."
        actions={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open Reports</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        }
      />

      {/* Inspect & Resolve Modal */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>
                Conductor Problem Report
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem', color: '#334155' }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>{selectedReport.category}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Reported on: {new Date(selectedReport.createdAt).toLocaleString()}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><strong>Conductor:</strong> {selectedReport.conductorId?.name || '—'}</div>
                <div><strong>Trip ID:</strong> {selectedReport.tripId || '—'}</div>
                <div><strong>Passenger:</strong> {selectedReport.passengerName || '—'}</div>
                <div><strong>Ticket No:</strong> {selectedReport.ticketNumber || '—'}</div>
                <div><strong>Bus:</strong> {selectedReport.busId?.busNumber || '—'}</div>
                <div><strong>Status:</strong> {selectedReport.status}</div>
              </div>

              <div>
                <strong>Description from Conductor:</strong>
                <p style={{ margin: '6px 0 0', padding: 12, background: '#fef2f2', borderRadius: 8, color: '#991b1b', lineHeight: 1.5 }}>
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.resolvedBy && (
                <div style={{ fontSize: '0.8rem', color: '#16a34a', background: '#f0fdf4', padding: 10, borderRadius: 8 }}>
                  Resolved by {selectedReport.resolvedBy.name} on {new Date(selectedReport.resolvedAt).toLocaleString()}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>
                  Resolution Notes / Action Taken:
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter notes on how this problem was handled or resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'UNDER_REVIEW')}
                  disabled={updating}
                  style={{ padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark Under Review
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'RESOLVED')}
                  disabled={updating}
                  style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConductorReports;
