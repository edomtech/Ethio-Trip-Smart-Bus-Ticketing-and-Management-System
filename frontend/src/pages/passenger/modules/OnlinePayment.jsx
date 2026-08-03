import React, { useState } from 'react';
import { FaCreditCard, FaMobile, FaUniversity, FaCheckCircle, FaLock, FaShieldAlt } from 'react-icons/fa';
import { paymentAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const METHODS = [
  { id: 'telebirr', label: 'Telebirr', icon: <FaMobile />, color: '#7c3aed', desc: 'Pay with Telebirr mobile wallet' },
  { id: 'cbe', label: 'CBE Birr', icon: <FaUniversity />, color: '#1d4ed8', desc: 'Commercial Bank of Ethiopia' },
  { id: 'card', label: 'Debit/Credit Card', icon: <FaCreditCard />, color: '#0d9488', desc: 'Visa, Mastercard accepted' },
  { id: 'dashen', label: 'Dashen Bank', icon: <FaUniversity />, color: '#d97706', desc: 'Dashen Bank online payment' },
];

const OnlinePayment = ({ booking, onSuccess }) => {
  const { user } = useAuth();
  const [method, setMethod] = useState(METHODS[0]);
  const [phone, setPhone] = useState(user?.phone || '');
  const [processing, setProcessing] = useState(false);

  const amount = booking?.totalPrice || 0;

  const handlePay = async (e) => {
    e.preventDefault();
    if (!phone) { toast.error('Please enter your phone/account number'); return; }
    setProcessing(true);
    try {
      const res = await paymentAPI.initiate({ bookingId: booking?._id, method: method.id, amount });
      toast.success('Payment successful! Your ticket has been confirmed.');
      onSuccess?.(res);
    } catch (err) { toast.error(err.message || 'Payment failed. Please try again.'); }
    finally { setProcessing(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, maxWidth: 900 }}>
      {/* Payment Methods */}
      <div>
        <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Choose Payment Method</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m)}
              style={{ padding: '16px', borderRadius: 14, border: `2px solid ${method.id === m.id ? m.color : '#e2e8f0'}`, background: method.id === m.id ? `${m.color}10` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .2s' }}>
              <div style={{ fontSize: '1.5rem', color: m.color, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{m.label}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handlePay}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 8, fontSize: '0.88rem' }}>
              {method.id === 'card' ? 'Card Number' : 'Phone / Account Number'}
            </label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder={method.id === 'card' ? '•••• •••• •••• ••••' : '+251 9XX XXX XXX'}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={processing}
            style={{ width: '100%', padding: '14px 0', background: processing ? '#e2e8f0' : `linear-gradient(135deg, ${method.color}, ${method.color}cc)`, color: processing ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <FaLock />{processing ? 'Processing...' : `Pay ETB ${amount.toLocaleString()}`}
          </button>
        </form>

        {/* Security Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '10px 16px', background: '#f0fdf4', borderRadius: 10 }}>
          <FaShieldAlt style={{ color: '#16a34a' }} />
          <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>256-bit SSL encrypted · Your payment is 100% secure</span>
        </div>
      </div>

      {/* Order Summary */}
      <div style={{ background: '#f8fafc', borderRadius: 16, padding: 22, alignSelf: 'start' }}>
        <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Order Summary</h4>
        {booking && (
          <>
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', marginBottom: 6 }}>
                {booking.schedule?.route?.from} → {booking.schedule?.route?.to}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {booking.schedule?.date} · {booking.schedule?.departureTime}<br />
                Seat(s): {Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(', ') : booking.selectedSeats}
              </div>
            </div>
            {[
              { label: 'Base Fare', val: `ETB ${booking.totalPrice}` },
              { label: 'Service Fee', val: 'ETB 0' },
              { label: 'Tax', val: 'ETB 0' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: '#64748b' }}>
                <span>{r.label}</span><span>{r.val}</span>
              </div>
            ))}
            <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0f172a' }}>
              <span>Total</span><span style={{ color: '#078930' }}>ETB {booking.totalPrice}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.75rem', color: '#94a3b8' }}>
          <FaCheckCircle style={{ color: '#16a34a' }} /> Booking confirmed upon payment
        </div>
      </div>
    </div>
  );
};

export default OnlinePayment;
