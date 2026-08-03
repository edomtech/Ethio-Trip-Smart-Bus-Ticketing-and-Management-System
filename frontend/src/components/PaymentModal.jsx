import React, { useState } from 'react';
import { FaTimes, FaMobileAlt, FaUniversity, FaCreditCard, FaMoneyBillWave, FaLock, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { paymentAPI } from '../utils/api';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [method, setMethod] = useState('telebirr');
  const [phoneNumber, setPhoneNumber] = useState(booking?.passenger?.phone || '0911234567');
  const [accountNumber, setAccountNumber] = useState('1000123456789');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');

  if (!booking) return null;
  const amount = booking.totalPrice || 350;

  const handlePay = async (e) => {
    e.preventDefault();
    if (method === 'telebirr' && !phoneNumber) { toast.error('Enter Telebirr phone'); return; }
    if (method === 'cbe' && !accountNumber) { toast.error('Enter CBE account number'); return; }
    setIsProcessing(true);
    try {
      const res = await paymentAPI.initiate({
        bookingId: booking._id,
        amount,
        method: method === 'telebirr' ? 'Telebirr' : method === 'cbe' ? 'CBE Birr' : method === 'chapa' ? 'Chapa' : 'Cash',
      });
      setIsSuccess(true);
      setTxnId(res.transactionId || 'ETB-TXN-' + Math.random().toString(36).substr(2, 8).toUpperCase());
      toast.success('Payment completed successfully!');
      setTimeout(() => { if (onSuccess) onSuccess({ ...booking, paymentStatus: 'completed', status: 'confirmed' }); }, 1500);
    } catch (err) {
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const methods = [
    { key: 'telebirr', label: 'Telebirr', icon: <FaMobileAlt /> },
    { key: 'cbe',      label: 'CBE Birr', icon: <FaUniversity /> },
    { key: 'chapa',    label: 'Chapa',    icon: <FaCreditCard /> },
    { key: 'cash',     label: 'Cash',     icon: <FaMoneyBillWave /> },
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#078930,#056e26)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FCDD09', textTransform: 'uppercase', letterSpacing: '1px' }}>Secure Payment</div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Complete Your Booking</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>
                <FaCheckCircle />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Payment Confirmed!</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>Ref: <strong>{txnId}</strong></p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '12px', marginTop: '16px', fontSize: '0.9rem', color: '#334155' }}>
                Amount Paid: <strong style={{ color: '#078930' }}>ETB {amount}</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginTop: '16px' }}>Generating your digital boarding ticket...</p>
            </div>
          ) : (
            <form onSubmit={handlePay}>
              {/* Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#078930', fontWeight: 800, textTransform: 'uppercase' }}>Ticket Summary</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{booking.schedule?.route?.from} → {booking.schedule?.route?.to}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Seat(s): {Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(', ') : booking.selectedSeats}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Due</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#078930' }}>ETB {amount}</div>
                </div>
              </div>

              {/* Method picker */}
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>Select Payment Method</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {methods.map(m => (
                  <button key={m.key} type="button" onClick={() => setMethod(m.key)} style={{ padding: '10px 4px', borderRadius: '12px', border: method === m.key ? '2px solid #078930' : '1px solid #e2e8f0', background: method === m.key ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ color: '#078930', fontSize: '1.2rem' }}>{m.icon}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', color: '#334155' }}>{m.label}</div>
                  </button>
                ))}
              </div>

              {method === 'telebirr' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Telebirr Phone</label>
                  <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="0911XXXXXX"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              )}
              {method === 'cbe' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>CBE Account Number</label>
                  <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="1000XXXXXXXXX"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              )}
              {method === 'chapa' && (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                  You will be redirected to Chapa secure portal.
                </div>
              )}
              {method === 'cash' && (
                <div style={{ padding: '12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', fontSize: '0.8rem', color: '#854d0e', marginBottom: '16px' }}>
                  Pay at Ethio Bus counter. Booking held for 2 hours.
                </div>
              )}

              <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#078930,#056e26)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaLock /> {isProcessing ? 'Processing...' : `Pay ETB ${amount}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
