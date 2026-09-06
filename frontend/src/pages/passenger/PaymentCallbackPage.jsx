import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaTicketAlt, FaArrowLeft, FaQrcode } from 'react-icons/fa';
import { paymentAPI } from '../../utils/api';
import TicketModal from '../../components/TicketModal';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your payment with Chapa...');
  const [details, setDetails] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref') || searchParams.get('txRef');

    if (!txRef) {
      setLoading(false);
      setSuccess(false);
      setMessage('No transaction reference found in payment response.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await paymentAPI.chapaVerify(txRef);
        if (res.verified) {
          setSuccess(true);
          setMessage('Payment successfully verified!');
          setDetails(res);
          setShowTicketModal(true); // Automatically open E-Ticket Modal on payment completion!
        } else {
          setSuccess(false);
          setMessage(res.message || 'Payment verification failed or was canceled.');
          setDetails(res);
        }
      } catch (err) {
        setSuccess(false);
        setMessage(err.message || 'Error verifying transaction status.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  // Format booking object for TicketModal
  const rawBooking = (details?.booking && typeof details.booking === 'object')
    ? details.booking
    : (details?.payment?.booking && typeof details.payment.booking === 'object')
      ? details.payment.booking
      : {};

  const bookingObj = (rawBooking._id || details?.booking || details?.payment) ? {
    ...(typeof rawBooking === 'object' ? rawBooking : {}),
    _id: rawBooking._id || details?.booking?._id || details?.payment?._id,
    ticketNumber: rawBooking.ticketNumber || details?.booking?.ticketNumber || `ETH-${(rawBooking._id || details?.payment?._id || '').slice(-6).toUpperCase()}`,
    passenger: rawBooking.passenger || details?.booking?.passenger || { name: 'Passenger' },
    schedule: rawBooking.schedule || details?.booking?.schedule || {},
    companyId: rawBooking.companyId || details?.booking?.companyId || details?.payment?.companyId,
    selectedSeats: rawBooking.selectedSeats || details?.booking?.selectedSeats || ['1'],
    totalPrice: details?.payment?.amount || rawBooking.totalPrice || 700,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    tripType: rawBooking.tripType || details?.booking?.tripType || (rawBooking.returnLeg?.schedule ? 'round' : 'oneway'),
    outboundLeg: rawBooking.outboundLeg || details?.booking?.outboundLeg,
    returnLeg: rawBooking.returnLeg || details?.booking?.returnLeg,
    tickets: details?.tickets || [],
  } : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '520px',
        borderRadius: '24px',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {loading ? (
          <div>
            <div style={{
              fontSize: '3rem',
              color: '#078930',
              animation: 'spin 1s linear infinite',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              <FaSpinner />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>Verifying Payment</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px' }}>Please wait while we confirm your payment with Chapa...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : success ? (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#dcfce7',
              color: '#15803d',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 20px'
            }}>
              <FaCheckCircle />
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800 }}>Payment Successful!</h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '8px' }}>{message}</p>

            {details?.payment?.amount && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                padding: '16px',
                margin: '24px 0',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: '#334155'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid:</span>
                  <strong style={{ color: '#15803d' }}>ETB {details.payment.amount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Transaction Ref:</span>
                  <strong style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{details.txRef}</strong>
                </div>
                {details.payment?.chapaRef && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Chapa Ref:</span>
                    <strong style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{details.payment.chapaRef}</strong>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setShowTicketModal(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #078930, #056e26)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(7,137,48,0.3)'
                }}>
                <FaQrcode /> View & Download E-Ticket with QR Code
              </button>

              <button
                onClick={() => navigate('/passenger/dashboard')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                <FaTicketAlt /> Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 20px'
            }}>
              <FaTimesCircle />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: 800 }}>Payment Unsuccessful</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px' }}>{message}</p>

            <button
              onClick={() => navigate('/passenger/dashboard')}
              style={{
                width: '100%',
                padding: '14px',
                background: '#475569',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '24px'
              }}>
              <FaArrowLeft /> Return to Dashboard
            </button>
          </div>
        )}
      </div>

      {showTicketModal && bookingObj && (
        <TicketModal
          booking={bookingObj}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </div>
  );
};

export default PaymentCallbackPage;

