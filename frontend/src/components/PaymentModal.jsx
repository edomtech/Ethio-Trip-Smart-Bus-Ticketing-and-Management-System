import React, { useState } from 'react';
import {
  FaTimes, FaMobileAlt, FaUniversity, FaCreditCard, FaLock,
  FaCheckCircle, FaBus, FaShieldAlt, FaUpload, FaImage, FaClock, FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { paymentAPI, bookingAPI } from '../utils/api';
import { useTranslation } from '../i18n';

const PaymentModal = ({ booking, onClose, onSuccess, onPaymentSuccess }) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState('chapa');
  const [phoneNumber, setPhoneNumber] = useState(booking?.passenger?.phone || '0911234567');
  const [accountNumber, setAccountNumber] = useState('1000123456789');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isReceiptSubmitted, setIsReceiptSubmitted] = useState(false);
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

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePay = async (e) => {
    e.preventDefault();

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

      if (!receiptImage) {
        toast.error('Please upload your payment receipt image before submitting to the agent.');
        setIsProcessing(false);
        return;
      }

      const res = await bookingAPI.uploadReceipt(booking._id, {
        receiptImage,
        paymentMethod: method,
        transactionReference: transactionReference.trim() || undefined,
        submittedAmount: submittedAmount ? Number(submittedAmount) : amount,
        receiptNote: receiptNote || `Paid via ${method === 'telebirr' ? 'Telebirr' : 'CBE Birr'} - Ref: ${transactionReference || phoneNumber || accountNumber}`,
      });

      setIsReceiptSubmitted(true);
      toast.success('Payment receipt submitted! Sent to agent for review and ticket approval.');

      if (callbackSuccess) {
        callbackSuccess(res.booking || {
          ...booking,
          receiptStatus: 'PENDING',
          status: 'RECEIPT_SUBMITTED',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment submission failed. Please try again.');
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
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[1200] p-4 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors"
      >
        {}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-5 sm:px-6 text-white flex justify-between items-center">
          <div>
            <div className="text-[11px] font-black text-blue-200 uppercase tracking-wider">
              {t('secure payment', 'Secure Payment')}
            </div>
            <h3 className="m-0 mt-0.5 text-lg font-extrabold text-white">
              {t('choose payment method', 'Choose Payment Method')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {isReceiptSubmitted ? (
            <div className="text-center py-5">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3.5 shadow-md shadow-amber-500/20">
                <FaClock />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Receipt Submitted to Agent!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs my-2 max-w-sm mx-auto leading-relaxed">
                Your payment receipt has been submitted to the ticketing agent. As soon as the agent verifies and approves your receipt, your E-Ticket will be confirmed.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-xs text-left space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket Ref:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{booking.ticketNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <strong className="text-emerald-600 font-bold">ETB {amount.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <strong className="text-slate-900 dark:text-white uppercase">{method}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    Awaiting Agent Approval
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer transition shadow-md shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3.5 shadow-md shadow-emerald-500/20">
                <FaCheckCircle />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Payment Confirmed</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs my-1.5 mb-4">
                Ref: <strong className="text-slate-900 dark:text-slate-200 font-mono">{txnId}</strong>
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                Total Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-black">ETB {amount.toFixed(2)}</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePay}>
              {}
              {(() => {
                const isRound = booking.tripType === 'round' || Boolean(booking.returnLeg?.schedule || (booking.returnLeg?.seats && booking.returnLeg.seats.length > 0));
                const discountAmt = Number(booking.discountAmount) || (isRound ? Math.round((Number(booking.baseFare) || (amount / 0.9)) * 0.1) : 0);
                const baseFare = Number(booking.baseFare) || (discountAmt > 0 ? amount + discountAmt : amount);

                return (
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 mb-4">
                    <div className={`flex justify-between items-center ${discountAmt > 0 ? 'mb-2' : ''}`}>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span>{operatorName} · {t('seat(s)', 'Seat')} {seatsList}</span>
                          {isRound && (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                              {t('Round-Trip', 'Round-Trip')}
                            </span>
                          )}
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                          {routeFrom} → {routeTo}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">{t('total amount', 'Amount Due')}</div>
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                          ETB {amount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {discountAmt > 0 && (
                      <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 mt-1 flex justify-between items-center text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          ✓ {t('10% Round-Trip Discount Applied', '10% Round-Trip Discount Applied')}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                          - ETB {discountAmt.toFixed(2)} ({t('Subtotal', 'Subtotal')}: ETB {baseFare.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {}
              <div className="flex flex-col gap-2.5 mb-4">
                {methods.map(m => {
                  const isSelected = method === m.key;
                  return (
                    <div
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {m.icon}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            {t(m.label, m.label)}
                            {m.badge && (
                              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {t(m.badge, m.badge)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t(m.desc, m.desc)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {}
              {method !== 'chapa' && (
                <div className="space-y-3.5 mb-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <div className="text-xs space-y-1">
                    <strong className="text-amber-900 dark:text-amber-300 block font-bold">
                      {method === 'telebirr' ? '📱 Telebirr Transfer Instructions' : '🏦 CBE Bank Transfer Instructions'}
                    </strong>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0">
                      {method === 'telebirr'
                        ? 'Transfer ETB ' + amount.toFixed(2) + ' to Telebirr Number: 0911234567 (Ethio Trip). Then upload the payment confirmation receipt/screenshot below.'
                        : 'Transfer ETB ' + amount.toFixed(2) + ' to CBE Account: 1000123456789 (Ethio Trip Transport). Then upload the deposit slip/screenshot below.'}
                    </p>
                  </div>

                  {}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Upload Payment Receipt *
                    </label>

                    {receiptImage ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-900 max-h-48 flex items-center justify-center group">
                        <img src={receiptImage} alt="Uploaded receipt preview" className="max-h-44 object-contain" />
                        <button
                          type="button"
                          onClick={() => setReceiptImage('')}
                          className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                          <FaTimes /> Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-xl cursor-pointer bg-white dark:bg-slate-800 transition">
                        <FaUpload className="text-2xl text-slate-400 mb-1.5" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Click to select receipt screenshot/photo
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Transaction Reference ID
                      </label>
                      <input
                        type="text"
                        value={transactionReference}
                        onChange={e => setTransactionReference(e.target.value)}
                        placeholder="e.g. TXN9876543210"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Paid Amount (ETB)
                      </label>
                      <input
                        type="number"
                        value={submittedAmount}
                        onChange={e => setSubmittedAmount(e.target.value)}
                        placeholder={amount.toFixed(2)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Additional Note / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={receiptNote}
                      onChange={e => setReceiptNote(e.target.value)}
                      placeholder="e.g. Paid from Abyssinia / Telebirr confirmation code"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3.5 px-4 text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition ${
                  method === 'chapa'
                    ? 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-blue-600/25'
                    : 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-emerald-600/25'
                }`}
              >
                <FaLock /> {isProcessing ? t('Processing...', 'Processing…') : method === 'chapa' ? `${t('pay with chapa', 'Pay with Chapa')} (ETB ${amount.toFixed(2)}) →` : `Send Receipt to Agent for Approval (ETB ${amount.toFixed(2)})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
