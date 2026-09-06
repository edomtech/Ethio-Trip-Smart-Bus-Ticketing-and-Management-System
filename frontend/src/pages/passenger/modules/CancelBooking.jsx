import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaTicketAlt, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaExchangeAlt, FaMoneyBillWave } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const CancelBooking = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cancelLeg, setCancelLeg] = useState('all'); // 'all' | 'outbound' | 'return'
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingAPI.getMyBookings();
      setBookings(res || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      const isPaid = (selected.paymentStatus === 'PAID' || selected.paymentStatus === 'paid' || selected.paymentStatus === 'completed');
      const res = await bookingAPI.cancel(selected._id, reason || (isPaid ? 'Cancelled by passenger' : 'Unpaid reservation cancelled by passenger'), cancelLeg);
      if (isPaid && (res?.refundAmount > 0 || res?.isPaid)) {
        toast.success(`Booking cancellation processed. Eligible refund: ETB ${res.refundAmount || 0}`);
      } else {
        toast.success('Reservation cancelled successfully. Reserved seats have been released.');
      }
      setSelected(null);
      setReason('');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'confirmed' || b.status === 'PENDING_PAYMENT' || b.status === 'pending');
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'cancelled' || (b.refundStatus && b.refundStatus !== 'NONE'));

  // Refund estimation calculation helper
  const calculateEstimatedRefund = (bk, targetLeg) => {
    if (!bk) return 0;
    if (bk.paymentStatus !== 'PAID' && bk.paymentStatus !== 'completed') return 0;
    const policy = bk.companyId?.cancellationPolicy || { allowed: true, deadlineHours: 24, refundPercentage: 80 };
    if (!policy.allowed) return 0;

    const refundRate = (policy.refundPercentage || 80) / 100;
    const isRound = bk.tripType === 'round' && Boolean(bk.returnLeg?.schedule || (bk.returnLeg?.seats && bk.returnLeg.seats.length > 0));
    if (isRound && targetLeg === 'return') {
      const returnPrice = bk.returnLeg?.price || bk.totalPrice / 2;
      return Math.round(returnPrice * refundRate);
    }
    if (isRound && targetLeg === 'outbound') {
      const outboundPrice = bk.outboundLeg?.price || bk.totalPrice / 2;
      return Math.round(outboundPrice * refundRate);
    }
    return Math.round((bk.totalPrice || 0) * refundRate);
  };

  return (
    <div>
      <AdminPageHeader
        category="TICKET CANCELLATION & SETTLEMENTS"
        title="Cancellation & Refund Portal"
        icon={<FaMoneyBillWave />}
        subtitle="Cancel active one-way or round-trip tickets and process automated refund calculations according to operator policies."
        stats={[
          { label: 'Active Trips', value: activeBookings.length, color: '#0284c7' },
          { label: 'Cancelled Requests', value: cancelledBookings.length, color: '#dc2626' },
          { label: 'Standard Refund Rate', value: '80%', color: '#16a34a' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24, marginBottom: 32 }}>
        {/* Active Bookings List */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Eligible Active Bookings ({activeBookings.length})
          </h3>

          {activeBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <FaCheckCircle style={{ fontSize: '2.5rem', color: '#16a34a', marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: 0 }}>No active bookings currently eligible for cancellation.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeBookings.map((bk) => {
                const isSelected = selected?._id === bk._id;
                const isRound = bk.tripType === 'round' && Boolean(bk.returnLeg?.schedule || (bk.returnLeg?.seats && bk.returnLeg.seats.length > 0));
                const isPaid = (bk.paymentStatus === 'PAID' || bk.paymentStatus === 'paid' || bk.paymentStatus === 'completed');
                const companyPolicy = bk.companyId?.cancellationPolicy || { allowed: true, deadlineHours: 24, refundPercentage: 80 };

                return (
                  <div
                    key={bk._id}
                    onClick={() => {
                      setSelected(bk);
                      setCancelLeg('all');
                    }}
                    style={{
                      background: isSelected ? '#fef2f2' : '#ffffff',
                      border: `2px solid ${isSelected ? '#dc2626' : '#e2e8f0'}`,
                      borderRadius: 14,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '1.1rem' }}>
                          <FaTicketAlt />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                            {bk.schedule?.route?.from || 'Origin'} ➔ {bk.schedule?.route?.to || 'Destination'}
                            {isRound ? (
                              <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 5, fontWeight: 800 }}>
                                Round-Trip
                              </span>
                            ) : (
                              <span style={{ marginLeft: 8, background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 5, fontWeight: 800 }}>
                                One-Way
                              </span>
                            )}
                            {isPaid ? (
                              <span style={{ marginLeft: 6, background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', padding: '2px 6px', borderRadius: 5, fontWeight: 800 }}>
                                Paid
                              </span>
                            ) : (
                              <span style={{ marginLeft: 6, background: '#fee2e2', color: '#dc2626', fontSize: '0.68rem', padding: '2px 6px', borderRadius: 5, fontWeight: 800 }}>
                                Unpaid
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                            {bk.ticketNumber} · {bk.companyId?.companyName || 'Ethio Trip'} · Date: {bk.schedule?.date || 'Scheduled'} · Seat: {Array.isArray(bk.selectedSeats) ? bk.selectedSeats.join(', ') : bk.selectedSeats}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#078930' }}>ETB {bk.totalPrice}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {isPaid ? `Policy: ${companyPolicy.refundPercentage}% Refund (≥${companyPolicy.deadlineHours}h prior)` : 'Unpaid (No Refund Applicable)'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancellation Action Side-Panel */}
        {selected && (() => {
          const isSelectedRound = selected.tripType === 'round' && Boolean(selected.returnLeg?.schedule || (selected.returnLeg?.seats && selected.returnLeg.seats.length > 0));
          const isSelectedPaid = (selected.paymentStatus === 'PAID' || selected.paymentStatus === 'paid' || selected.paymentStatus === 'completed');

          return (
            <div style={{ background: '#fff', border: '2px solid #dc2626', borderRadius: 16, padding: 22, alignSelf: 'start' }}>
              <h4 style={{ fontWeight: 900, color: '#991b1b', margin: '0 0 12px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaExclamationTriangle /> {isSelectedPaid ? 'Cancel Ticket & Refund' : 'Cancel Reservation'}
              </h4>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, marginBottom: 4, color: '#0f172a' }}>
                  {selected.schedule?.route?.from} ➔ {selected.schedule?.route?.to}
                  <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: isSelectedRound ? '#fef3c7' : '#f1f5f9', color: isSelectedRound ? '#92400e' : '#475569', fontWeight: 800 }}>
                    {isSelectedRound ? 'Round-Trip' : 'One-Way'}
                  </span>
                </div>
                <div style={{ color: '#64748b' }}>Ticket No: <strong>{selected.ticketNumber}</strong></div>
                <div style={{ color: '#64748b' }}>Operator: {selected.companyId?.companyName}</div>
                <div style={{ color: '#64748b' }}>Fare Amount: ETB {selected.totalPrice}</div>
                <div style={{ color: isSelectedPaid ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: 4 }}>
                  Payment Status: {isSelectedPaid ? 'PAID' : 'UNPAID'}
                </div>
              </div>

              {/* Journey Leg Selector for Round Trips Only */}
              {isSelectedRound && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>
                    Select Journey Leg to Cancel:
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { id: 'all', label: 'Entire Round Trip' },
                      { id: 'outbound', label: 'Outbound Only' },
                      { id: 'return', label: 'Return Only' },
                    ].map((leg) => (
                      <button
                        key={leg.id}
                        type="button"
                        onClick={() => setCancelLeg(leg.id)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          border: `1.5px solid ${cancelLeg === leg.id ? '#dc2626' : '#cbd5e1'}`,
                          background: cancelLeg === leg.id ? '#fef2f2' : '#fff',
                          color: cancelLeg === leg.id ? '#991b1b' : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {leg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid: Show Refund Estimate Notice */}
              {isSelectedPaid ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>ESTIMATED REFUND AMOUNT:</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d' }}>
                    ETB {calculateEstimatedRefund(selected, cancelLeg)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: 2 }}>
                    Calculated according to {selected.companyId?.companyName || 'Operator'} cancellation policy.
                  </div>
                </div>
              ) : (
                /* Unpaid: Clear Notice that No Refund is Issued */
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 800, marginBottom: 2 }}>UNPAID RESERVATION</div>
                  <div style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.4 }}>
                    This booking has not been paid yet. Cancelling will immediately release your reserved seat(s) back to the bus schedule. No refund is applicable.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Reason for Cancellation (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Schedule change, emergency"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    padding: '11px',
                    background: cancelling ? '#e2e8f0' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color: cancelling ? '#94a3b8' : '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: cancelling ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.88rem',
                  }}
                >
                  <FaTimesCircle /> {cancelling ? 'Processing...' : (isSelectedPaid ? 'Confirm Cancellation & Request Refund' : 'Cancel Unpaid Reservation')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{
                    padding: '9px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Keep Reservation
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Cancellation & Refund History Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
          Refund &amp; Cancellation History
        </h3>

        <DataTable
          columns={[
            {
              header: 'Ticket No',
              render: (bk) => <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>{bk.ticketNumber}</span>,
            },
            {
              header: 'Bus Operator',
              render: (bk) => <span style={{ fontWeight: 700 }}>{bk.companyId?.companyName || 'Ethio Trip'}</span>,
            },
            {
              header: 'Route',
              render: (bk) => <span>{bk.schedule?.route?.from || 'Origin'} ➔ {bk.schedule?.route?.to || 'Destination'}</span>,
            },
            {
              header: 'Refund Amount',
              render: (bk) => <span style={{ fontWeight: 800, color: '#15803d' }}>ETB {bk.refundAmount || 0}</span>,
            },
            {
              header: 'Refund Status',
              render: (bk) => {
                const isApproved = bk.refundStatus === 'APPROVED' || bk.refundStatus === 'PROCESSED';
                const isPending = bk.refundStatus === 'PENDING';
                return (
                  <span className={`eb-badge ${isApproved ? 'eb-badge-active' : isPending ? 'eb-badge-pending' : 'eb-badge-inactive'}`}>
                    {bk.refundStatus || 'CANCELLED'}
                  </span>
                );
              },
            },
            {
              header: 'Reason',
              render: (bk) => <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{bk.cancellationReason || bk.refundReason || 'User requested'}</span>,
            },
          ]}
          data={cancelledBookings}
          loading={loading}
          searchable={false}
          emptyMessage="No cancellation or refund records found."
        />
      </div>
    </div>
  );
};

export default CancelBooking;
