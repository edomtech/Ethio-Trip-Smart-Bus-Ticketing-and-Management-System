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
          setShowTicketModal(true);  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-5 font-sans">
      <div className="bg-white w-full max-w-[520px] rounded-3xl py-9 px-7 text-center shadow-2xl">
        {loading ? (
          <div>
            <div className="text-5xl text-[#078930] animate-spin inline-block mb-4">
              <FaSpinner />
            </div>
            <h2 className="text-[1.4rem] text-slate-900 font-extrabold">Verifying Payment</h2>
            <p className="text-slate-500 text-[0.95rem] mt-2">Please wait while we confirm your payment with Chapa...</p>
          </div>
        ) : success ? (
          <div>
            <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">
              <FaCheckCircle />
            </div>
            <h2 className="text-[1.6rem] text-slate-900 font-extrabold">Payment Successful!</h2>
            <p className="text-slate-600 text-[0.95rem] mt-2">{message}</p>

            {details?.payment?.amount && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 my-6 text-left text-[0.9rem] text-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Amount Paid:</span>
                  <strong className="text-green-700">ETB {details.payment.amount}</strong>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <strong className="text-[0.8rem] font-mono">{details.txRef}</strong>
                </div>
                {details.payment?.chapaRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chapa Ref:</span>
                    <strong className="text-[0.8rem] font-mono">{details.payment.chapaRef}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowTicketModal(true)}
                className="w-full p-3.5 bg-gradient-to-br from-[#078930] to-[#056e26] text-white border-none rounded-2xl font-extrabold text-base cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(7,137,48,0.3)] hover:brightness-105 transition-all">
                <FaQrcode /> View & Download E-Ticket with QR Code
              </button>

              <button
                onClick={() => navigate('/passenger/dashboard')}
                className="w-full p-3 bg-slate-100 text-slate-700 border-none rounded-2xl font-bold text-[0.9rem] cursor-pointer flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                <FaTicketAlt /> Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-20 h-20 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">
              <FaTimesCircle />
            </div>
            <h2 className="text-[1.5rem] text-slate-900 font-extrabold">Payment Unsuccessful</h2>
            <p className="text-slate-500 text-[0.95rem] mt-2">{message}</p>

            <button
              onClick={() => navigate('/passenger/dashboard')}
              className="w-full p-3.5 bg-slate-600 text-white border-none rounded-2xl font-extrabold text-base cursor-pointer flex items-center justify-center gap-2.5 mt-6 hover:bg-slate-700 transition-colors">
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
