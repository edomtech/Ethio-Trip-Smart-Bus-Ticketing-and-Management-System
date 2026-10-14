import React, { useState, useEffect } from 'react';
import { conductorReportAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const AdminConductorReports = () => {
  const { t } = useTranslation();
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
    } catch {
      toast.error(t('conductor.reportLoadFailed', 'Failed to load conductor problem reports'));
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
      toast.success(`${t('conductor.reportStatusUpdated', 'Report status updated to')} ${newStatus}`);
      setSelectedReport(null);
      setResolutionNotes('');
      fetchReports();
    } catch (err) {
      toast.error(err.message || t('conductor.reportUpdateFailed', 'Failed to update report status'));
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

  return (
    <div>
      <DataTable
        columns={[
          {
            header: t('conductor.dateTime', 'Date / Time'),
            render: (r) => (
              <span className="text-[0.8rem] text-slate-500 whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            ),
          },
          {
            header: t('conductor.conductor', 'Conductor'),
            render: (r) => (
              <div>
                <div className="font-bold text-slate-900">{r.conductorId?.name || t('conductor.conductor', 'Conductor')}</div>
                <div className="text-xs text-slate-500">{r.conductorId?.phone || r.conductorId?.email}</div>
              </div>
            ),
          },
          {
            header: t('conductor.categoryTrip', 'Category & Trip'),
            render: (r) => (
              <div>
                <div className="font-extrabold text-blue-600">{r.category}</div>
                <div className="text-xs text-slate-500">
                  {r.tripId ? `${t('conductor.trip', 'Trip')}: ${r.tripId}` : ''} {r.busId?.busNumber ? `• ${t('admin.bus', 'Bus')}: ${r.busId.busNumber}` : ''}
                </div>
              </div>
            ),
          },
          {
            header: t('conductor.passengerTicket', 'Passenger / Ticket'),
            render: (r) => (
              <div>
                <div className="font-semibold">{r.passengerName || '—'}</div>
                <div className="text-xs text-slate-500">{r.ticketNumber || '—'}</div>
              </div>
            ),
          },
          {
            header: t('conductor.description', 'Description'),
            render: (r) => (
              <div className="max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem]">
                {r.description}
              </div>
            ),
          },
          {
            header: t('common.status', 'Status'),
            render: (r) => {
              const isOpen = r.status === 'OPEN';
              const isReview = r.status === 'UNDER_REVIEW';
              return (
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                  isOpen
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : isReview
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-green-50 text-green-600 border-green-200'
                }`}>
                  {r.status}
                </span>
              );
            },
          },
          {
            header: t('common.actions', 'Action'),
            render: (r) => (
              <button
                onClick={() => {
                  setSelectedReport(r);
                  setResolutionNotes(r.resolutionNotes || '');
                }}
                className="px-3 py-1.5 bg-blue-600 text-white border-none rounded-lg text-[0.8rem] font-bold cursor-pointer hover:bg-blue-700 transition-colors"
              >
                {t('conductor.inspectResolve', 'Inspect & Resolve')}
              </button>
            ),
          },
        ]}
        data={filteredReports}
        loading={loading}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('conductor.searchReportPlaceholder', 'Search category, conductor, passenger, ticket...')}
        actions={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-emerald-600"
          >
            <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="OPEN">{t('conductor.openReports', 'Open Reports')}</option>
            <option value="UNDER_REVIEW">{t('conductor.underReview', 'Under Review')}</option>
            <option value="RESOLVED">{t('conductor.resolved', 'Resolved')}</option>
            <option value="CLOSED">{t('conductor.closed', 'Closed')}</option>
          </select>
        }
      />

      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl max-w-[580px] w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
              <h3 className="m-0 font-black text-[1.2rem] text-slate-900">
                {t('conductor.problemReportTitle', 'Conductor Problem Report')}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="bg-none border-none text-[1.2rem] cursor-pointer text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[0.88rem] text-slate-700">
              <div className="bg-slate-50 p-3 rounded-[10px] border border-slate-100">
                <div className="font-extrabold text-blue-600 text-base">{selectedReport.category}</div>
                <div className="text-[0.78rem] text-slate-500">{t('conductor.reportedOn', 'Reported on')}: {new Date(selectedReport.createdAt).toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div><strong>{t('conductor.conductor', 'Conductor')}:</strong> {selectedReport.conductorId?.name || '—'}</div>
                <div><strong>{t('conductor.tripId', 'Trip ID')}:</strong> {selectedReport.tripId || '—'}</div>
                <div><strong>{t('passenger.passenger', 'Passenger')}:</strong> {selectedReport.passengerName || '—'}</div>
                <div><strong>{t('ticket.ticketNumber', 'Ticket No')}:</strong> {selectedReport.ticketNumber || '—'}</div>
                <div><strong>{t('admin.bus', 'Bus')}:</strong> {selectedReport.busId?.busNumber || '—'}</div>
                <div><strong>{t('common.status', 'Status')}:</strong> {selectedReport.status}</div>
              </div>

              <div>
                <strong>{t('conductor.descFromConductor', 'Description from Conductor')}:</strong>
                <p className="mt-1.5 p-3 bg-red-50 rounded-lg text-red-800 leading-relaxed">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.resolvedBy && (
                <div className="text-[0.8rem] text-green-600 bg-green-50 p-2.5 rounded-lg">
                  {t('conductor.resolvedBy', 'Resolved by')} {selectedReport.resolvedBy.name} {t('conductor.on', 'on')} {new Date(selectedReport.resolvedAt).toLocaleString()}
                </div>
              )}

              <div>
                <label className="block font-bold text-[0.82rem] mb-1.5">
                  {t('conductor.resolutionNotes', 'Resolution Notes / Action Taken')}:
                </label>
                <textarea
                  rows={3}
                  placeholder={t('conductor.resolutionPlaceholder', 'Enter notes on how this problem was handled or resolved...')}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end mt-3.5">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'UNDER_REVIEW')}
                  disabled={updating}
                  className="px-3.5 py-2 bg-amber-500 text-white border-none rounded-lg font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-70"
                >
                  {t('conductor.markReview', 'Mark Under Review')}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'RESOLVED')}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 text-white border-none rounded-lg font-extrabold cursor-pointer hover:bg-green-700 transition-colors disabled:opacity-70"
                >
                  {t('conductor.markResolved', 'Mark Resolved')}
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
