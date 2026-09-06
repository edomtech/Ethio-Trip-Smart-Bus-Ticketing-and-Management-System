import React, { useState, useEffect } from 'react';
import { scheduleAPI, ticketAPI, busAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  FaShieldAlt,
  FaFilter,
  FaCheck,
  FaTimes,
  FaSearch,
  FaBus,
  FaCalendarAlt,
  FaUserCheck,
  FaExclamationCircle,
} from 'react-icons/fa';

const TripPassengerVerification = () => {
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBusId, setSelectedBusId] = useState('');

  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [passengers, setPassengers] = useState([]);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectionModalTicket, setRejectionModalTicket] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [boardingFilter, setBoardingFilter] = useState('ALL'); // 'ALL' | 'BOARDED' | 'NOT_BOARDED'

  const filteredPassengers = passengers.filter((p) => {
    if (boardingFilter === 'BOARDED') return p.boardingStatus === 'BOARDED';
    if (boardingFilter === 'NOT_BOARDED') return p.boardingStatus !== 'BOARDED';
    return true;
  });

  useEffect(() => {
    loadSchedulesAndBuses();
  }, []);

  const loadSchedulesAndBuses = async () => {
    try {
      setLoadingSchedules(true);
      const [schedRes, busRes] = await Promise.all([
        scheduleAPI.getAll(),
        busAPI.getAll(),
      ]);
      setSchedules(schedRes || []);
      setBuses(busRes || []);
      if (schedRes && schedRes.length > 0) {
        setSelectedScheduleId(schedRes[0]._id);
        fetchPassengers(schedRes[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load company trip schedules.');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchPassengers = async (scheduleId) => {
    if (!scheduleId) return;
    try {
      setLoadingPassengers(true);
      const data = await ticketAPI.getTripManifest({ scheduleId });
      setManifestData(data);
      setPassengers(data.passengers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch trip passenger manifest.');
      setManifestData(null);
      setPassengers([]);
    } finally {
      setLoadingPassengers(false);
    }
  };

  const handleScheduleChange = (e) => {
    const id = e.target.value;
    setSelectedScheduleId(id);
    if (id) fetchPassengers(id);
  };

  const handleVerifyTicket = async (ticket) => {
    try {
      setActionLoadingId(ticket._id);
      const res = await ticketAPI.agentVerify({
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: 'VERIFIED',
      });
      toast.success(`Ticket ${ticket.ticketNumber} VERIFIED for ${ticket.passengerName}`);
      // Refresh manifest
      fetchPassengers(selectedScheduleId);
    } catch (err) {
      toast.error(err.message || 'Failed to verify ticket');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejection = (ticket) => {
    setRejectionModalTicket(ticket);
    setRejectionReason('ID or Name mismatch at counter');
  };

  const handleConfirmRejection = async () => {
    if (!rejectionModalTicket) return;
    try {
      setActionLoadingId(rejectionModalTicket._id);
      await ticketAPI.agentVerify({
        ticketId: rejectionModalTicket._id,
        ticketNumber: rejectionModalTicket.ticketNumber,
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Rejected by ticket agent at counter',
      });
      toast.warn(`Ticket ${rejectionModalTicket.ticketNumber} marked as REJECTED.`);
      setRejectionModalTicket(null);
      setRejectionReason('');
      fetchPassengers(selectedScheduleId);
    } catch (err) {
      toast.error(err.message || 'Failed to reject ticket');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mod-wrapper">
      {/* Header */}
      <div className="mod-header" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: '#fff', padding: '20px 24px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Trip Passenger Ticket Validity Verification</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#bbf7d0' }}>
              Select a trip to inspect passenger tickets and authorize validity before boarding.
            </p>
          </div>
          <FaShieldAlt style={{ fontSize: '32px', color: '#86efac' }} />
        </div>
      </div>

      {/* Filter Bar: Date + Bus + Trip Schedule */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              <FaBus style={{ marginRight: '4px' }} /> Select Trip / Schedule
            </label>
            <select
              value={selectedScheduleId}
              onChange={handleScheduleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
            >
              {schedules.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.tripId || 'TRP'} • {s.route?.from} → {s.route?.to} ({s.date} @ {s.departureTime})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => fetchPassengers(selectedScheduleId)}
              disabled={loadingPassengers || !selectedScheduleId}
              style={{
                background: '#15803d',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FaSearch /> Refresh Manifest
            </button>
          </div>
        </div>
      </div>

      {/* Manifest Summary KPI Bar */}
      {manifestData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Total Passengers</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{manifestData.totalPassengers}</div>
          </div>
          <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '10px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#059669' }}>Boarded Passengers</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{manifestData.boardedCount || 0}</div>
          </div>
          <div style={{ background: '#fffbeb', padding: '14px', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#b45309' }}>Awaiting Boarding</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{manifestData.notBoardedCount || 0}</div>
          </div>
          <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#166534' }}>Verified Tickets</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>{manifestData.verifiedCount}</div>
          </div>
          <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '10px', border: '1px solid #fecaca', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#991b1b' }}>Rejected</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#b91c1c' }}>{manifestData.rejectedCount}</div>
          </div>
        </div>
      )}

      {/* Boarding Filter Quick Pills */}
      {manifestData && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Passengers (${passengers.length})` },
            { id: 'BOARDED', label: `Boarded (${manifestData.boardedCount || 0})`, color: '#059669' },
            { id: 'NOT_BOARDED', label: `Not Boarded (${manifestData.notBoardedCount || 0})`, color: '#d97706' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setBoardingFilter(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1.5px solid ${boardingFilter === f.id ? (f.color || '#078930') : '#cbd5e1'}`,
                background: boardingFilter === f.id ? (f.color ? `${f.color}15` : '#ecfdf5') : '#ffffff',
                color: boardingFilter === f.id ? (f.color || '#078930') : '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Passenger List Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {loadingPassengers ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading passenger list...</div>
        ) : filteredPassengers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No passengers found matching your filter on this trip.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Seat</th>
                  <th style={{ padding: '12px 16px' }}>Passenger Name</th>
                  <th style={{ padding: '12px 16px' }}>Phone Number</th>
                  <th style={{ padding: '12px 16px' }}>Ticket Number</th>
                  <th style={{ padding: '12px 16px' }}>Payment</th>
                  <th style={{ padding: '12px 16px' }}>Agent Verification</th>
                  <th style={{ padding: '12px 16px' }}>Boarding Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Counter Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassengers.map((p) => {
                  const isVerified = p.verificationStatus === 'VERIFIED';
                  const isRejected = p.verificationStatus === 'REJECTED';
                  const isPending = !p.verificationStatus || p.verificationStatus === 'PENDING';
                  const isBoarded = p.boardingStatus === 'BOARDED';
                  const isLoading = actionLoadingId === p._id;

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#15803d' }}>{p.seatNumber}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.passengerName}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.passengerPhone || p.user?.phone || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#334155' }}>{p.ticketNumber}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          PAID
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isVerified ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                          color: isVerified ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                          border: `1px solid ${isVerified ? '#86efac' : isRejected ? '#fca5a5' : '#fde68a'}`,
                        }}>
                          {p.verificationStatus || 'PENDING'}
                        </span>
                        {isRejected && p.rejectionReason && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>{p.rejectionReason}</div>
                        )}
                        {isVerified && p.verifiedBy && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>By: {p.verifiedBy?.name || 'Agent'}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isBoarded ? '#ecfdf5' : '#f8fafc',
                          color: isBoarded ? '#059669' : '#64748b',
                          border: `1px solid ${isBoarded ? '#a7f3d0' : '#cbd5e1'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {isBoarded ? '✓ BOARDED' : '○ NOT BOARDED'}
                        </span>
                        {isBoarded && p.boardedAt && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {new Date(p.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleVerifyTicket(p)}
                            disabled={isLoading || isVerified}
                            style={{
                              background: isVerified ? '#e2e8f0' : '#16a34a',
                              color: isVerified ? '#94a3b8' : '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: isVerified || isLoading ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FaCheck /> {isVerified ? 'Verified' : 'Verify'}
                          </button>

                          <button
                            onClick={() => handleOpenRejection(p)}
                            disabled={isLoading || isRejected}
                            style={{
                              background: isRejected ? '#e2e8f0' : '#dc2626',
                              color: isRejected ? '#94a3b8' : '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: isRejected || isLoading ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FaTimes /> Reject
                          </button>
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

      {/* Rejection Modal */}
      {rejectionModalTicket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '17px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaExclamationCircle /> Reject Ticket Validity
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
              Specify the reason for rejecting ticket <strong>{rejectionModalTicket.ticketNumber}</strong> for passenger <strong>{rejectionModalTicket.passengerName}</strong>:
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid ID, Name mismatch, Expired booking"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setRejectionModalTicket(null)}
                style={{ background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPassengerVerification;
