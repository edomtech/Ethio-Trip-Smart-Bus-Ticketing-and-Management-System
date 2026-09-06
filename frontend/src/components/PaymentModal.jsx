import React, { useState } from 'react';
import {
  FaTimes, FaMobileAlt, FaUniversity, FaCreditCard, FaLock,
  FaCheckCircle, FaBus, FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { paymentAPI } from '../utils/api';

const PaymentModal = ({ booking, onClose, onSuccess, onPaymentSuccess }) => {
  const [method, setMethod] = useState('chapa');
  const [phoneNumber, setPhoneNumber] = useState(booking?.passenger?.phone || '0911234567');
  const [accountNumber, setAccountNumber] = useState('1000123456789');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');

  if (!booking) return null;

  const callbackSuccess = onSuccess || onPaymentSuccess;
  const amount = Number(booking.totalPrice) || Number(booking.totalAmount) || 600;
  const routeFrom = booking.schedule?.route?.from || booking.outboundLeg?.route?.from || 'Addis Ababa';
  const routeTo = booking.schedule?.route?.to || booking.outboundLeg?.route?.to || 'Destination';
  const operatorName = booking.companyId?.companyName || booking.schedule?.companyId?.companyName || 'Ethio Trip Service';
  const seatsList = Array.isArray(booking.selectedSeats)
    ? booking.selectedSeats.join(', ')
    : (booking.selectedSeats || booking.outboundLeg?.seats?.join(', ') || '1');

  const handlePay = async (e) => {
    e.preventDefault();
    if (method === 'telebirr' && !phoneNumber) {
      toast.error('Please enter your Telebirr mobile number');
      return;
    }
    if (method === 'cbe' && !accountNumber) {
      toast.error('Please enter your CBE account number');
      return;
    }

    setIsProcessing(true);
    try {
      if (method === 'chapa') {
        toast.info('Connecting to Chapa Payment Gateway...');
        const res = await paymentAPI.chapaInitialize(booking._id);
        if (res?.checkoutUrl) {
          toast.success('Redirecting to official Chapa checkout portal...');
          window.location.href = res.checkoutUrl;
          return;
        } else {
          throw new Error('Chapa checkout URL was not received.');
        }
      }

      // Non-Chapa direct payments (Telebirr / CBE Birr)
      const res = await paymentAPI.initiate({
        bookingId: booking._id,
        amount,
        method: method === 'telebirr' ? 'Telebirr' : 'CBE Birr',
      });

      setIsSuccess(true);
      const generatedTxn = res.transactionId || res.txRef || `ETB-TXN-${Date.now()}`;
      setTxnId(generatedTxn);
      toast.success('Payment completed successfully! E-Ticket confirmed.');

      setTimeout(() => {
        if (callbackSuccess) {
          callbackSuccess({
            ...booking,
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          });
        }
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const methods = [
    {
      key: 'chapa',
      label: 'Chapa Gateway',
      tag: 'Official Online',
      desc: 'Pay online via Telebirr, CBE Birr, Awash, or Cards',
      icon: <FaCreditCard />,
      badge: 'Popular',
    },
    {
      key: 'telebirr',
      label: 'Telebirr Direct',
      tag: 'Mobile Wallet',
      desc: 'Pay directly via Telebirr account',
      icon: <FaMobileAlt />,
    },
    {
      key: 'cbe',
      label: 'CBE Birr',
      tag: 'Bank Transfer',
      desc: 'Pay directly via Commercial Bank of Ethiopia',
      icon: <FaUniversity />,
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            padding: '20px 24px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Secure Payment
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 900 }}>
              Choose Payment Method
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: 32,
              height: 32,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
            }}
          >
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 14px',
                }}
              >
                <FaCheckCircle />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Payment Confirmed</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '6px 0 16px' }}>
                Ref: <strong>{txnId}</strong>
              </p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '12px', fontSize: '0.92rem', color: '#334155' }}>
                Total Paid: <strong style={{ color: '#16a34a' }}>ETB {amount.toFixed(2)}</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePay}>
              {/* Compact Trip Summary with Round-Trip Discount Breakdown */}
              {(() => {
                const isRound = booking.tripType === 'round' || Boolean(booking.returnLeg?.schedule || (booking.returnLeg?.seats && booking.returnLeg.seats.length > 0));
                const discountAmt = Number(booking.discountAmount) || (isRound ? Math.round((Number(booking.baseFare) || (amount / 0.9)) * 0.1) : 0);
                const baseFare = Number(booking.baseFare) || (discountAmt > 0 ? amount + discountAmt : amount);

                return (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: discountAmt > 0 ? 8 : 0 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{operatorName} · Seat {seatsList}</span>
                          {isRound && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                              Round-Trip
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.98rem' }}>
                          {routeFrom} → {routeTo}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Amount Due</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                          ETB {amount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {discountAmt > 0 && (
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                        <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✓ 10% Round-Trip Discount Applied
                        </span>
                        <span style={{ color: '#16a34a', fontWeight: 800 }}>
                          - ETB {discountAmt.toFixed(2)} (Subtotal: ETB {baseFare.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Method Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {methods.map(m => {
                  const isSelected = method === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            flexShrink: 0,
                          }}
                        >
                          {m.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{m.label}</span>
                            {m.badge && (
                              <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>{m.desc}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {method === 'telebirr' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Telebirr Phone Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="0911XXXXXX"
                    style={{
                      width: '100%',
                      padding: '11px 13px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {method === 'cbe' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    CBE Birr Mobile / Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="1000XXXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '11px 13px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 18px rgba(37,99,235,0.3)',
                }}
              >
                <FaLock /> {isProcessing ? 'Connecting…' : method === 'chapa' ? `Pay ETB ${amount.toFixed(2)} with Chapa →` : `Confirm & Pay ETB ${amount.toFixed(2)}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
