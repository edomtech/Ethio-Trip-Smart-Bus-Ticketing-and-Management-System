import React, { useState } from 'react';
import {
  FaCreditCard, FaUniversity, FaCheckCircle, FaLock,
  FaShieldAlt, FaBus, FaArrowRight, FaClock, FaTicketAlt, FaReceipt,
  FaExclamationCircle, FaInfoCircle, FaCheckDouble, FaTimes
} from 'react-icons/fa';
import { useTranslation } from '../../../i18n';
import { isAwaitingPayment } from '../../../utils/bookingStatus';

const TelebirrIcon = () => (
  <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="20" fill="#f5f3ff" />
    <rect x="22" y="14" width="36" height="52" rx="7" stroke="#7c3aed" strokeWidth="4" fill="none" />
    <rect x="34" y="20" width="12" height="3" rx="1.5" fill="#7c3aed" />
    <circle cx="40" cy="59" r="2.5" fill="#7c3aed" />
    <rect x="28" y="28" width="32" height="24" rx="4" fill="#7c3aed" />
    <rect x="46" y="36" width="10" height="8" rx="2" fill="#ede9fe" />
    <circle cx="51" cy="40" r="1.5" fill="#7c3aed" />
  </svg>
);

const CbeBirrIcon = () => (
  <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="20" fill="#eff6ff" />
    <path d="M40 16L18 28H62L40 16Z" fill="#2563eb" />
    <rect x="20" y="28" width="40" height="4" fill="#2563eb" />
    <rect x="24" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="37" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="50" y="34" width="6" height="22" rx="1" fill="#2563eb" />
    <rect x="18" y="58" width="44" height="6" rx="1" fill="#2563eb" />
  </svg>
);

const ChapaIcon = () => (
  <div className="flex items-center justify-center gap-2.5">
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="#10b981" strokeWidth="6" strokeDasharray="60 30" />
      <circle cx="24" cy="24" r="18" stroke="#f59e0b" strokeWidth="6" strokeDasharray="25 65" strokeDashoffset="-60" />
    </svg>
    <span className="text-[1.8rem] font-black text-slate-900 dark:text-white tracking-[-0.5px]">
      chapa
    </span>
  </div>
);

const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'Telebirr Wallet',
    color: '#6d28d9',
    buttonColor: '#6d28d9',
    buttonClass: 'bg-purple-700 hover:bg-purple-800',
    icon: <TelebirrIcon />,
    description: 'Pay directly using your Telebirr mobile wallet or Telebirr SuperApp.',
  },
  {
    id: 'cbe',
    name: 'CBE Birr Mobile',
    color: '#2563eb',
    buttonColor: '#2563eb',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
    icon: <CbeBirrIcon />,
    description: 'Direct payment via Commercial Bank of Ethiopia (CBE) mobile banking.',
  },
  {
    id: 'chapa',
    name: 'Chapa Payment Gateway',
    color: '#059669',
    buttonColor: '#059669',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    icon: <ChapaIcon />,
    description: 'Pay instantly via Chapa Ethiopian fintech gateway supporting all local wallets & cards.',
  },
];

const PaymentCenter = ({ myBookings = [], onSelectBus, onPayBooking, onViewTicket }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showBookFirstModal, setShowBookFirstModal] = useState(false);

  const pendingBookings = myBookings.filter(isAwaitingPayment);

  const handleArrowClick = (method) => {
    if (pendingBookings.length > 0 && onPayBooking) {
      onPayBooking(pendingBookings[0]);
    } else {
      setSelectedMethod(method);
      setShowBookFirstModal(true);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
      <div className="mt-1">
        <h2 className="text-[1.25rem] font-black text-slate-900 dark:text-white m-0 mb-4.5 ml-0.5">
          {t('payment methods', 'Payment Methods')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5.5">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div className="py-9.5 px-6 pb-7.5 flex flex-col items-center justify-center min-h-[180px] text-center">
                <div className="mb-4.5">
                  {m.icon}
                </div>
                <div className="text-[1.15rem] font-black text-slate-900 dark:text-white">
                  {t(m.name, m.name)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleArrowClick(m)}
                className={`w-full text-white py-4 flex items-center justify-center cursor-pointer text-[1.4rem] font-black transition opacity-95 hover:opacity-100 ${m.buttonClass || 'bg-slate-800'}`}
                title={`${t('pay now', 'Pay with')} ${t(m.name, m.name)}`}
              >
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {pendingBookings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-500 p-5.5 shadow-lg shadow-red-500/10 mt-2.5">
          <div className="flex items-center gap-2 text-red-600 font-black text-[1.05rem] mb-3.5">
            <FaExclamationCircle /> {t('pending payment', 'Pending Payment')} ({pendingBookings.length} {t('awaiting payment', 'Awaiting Payment')})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingBookings.map((bk) => {
              const isReceiptPending = bk.receiptStatus === 'PENDING';
              return (
                <div
                  key={bk._id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                    isReceiptPending
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[0.75rem] font-extrabold uppercase ${isReceiptPending ? 'text-amber-800 dark:text-amber-400' : 'text-red-800 dark:text-red-400'}`}>
                        {bk.schedule?.companyId?.companyName || 'Intercity Bus'}
                      </span>
                      {isReceiptPending && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200/80 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                          Awaiting Agent Approval
                        </span>
                      )}
                    </div>
                    <div className="font-black text-slate-900 dark:text-white text-[1.05rem]">
                      {bk.schedule?.route?.from || 'Addis Ababa'} → {bk.schedule?.route?.to || 'Destination'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      Ref: {bk.ticketNumber}
                    </div>
                  </div>

                  <div className={`flex justify-between items-center border-t border-dashed pt-2.5 ${isReceiptPending ? 'border-amber-200 dark:border-amber-900/40' : 'border-red-200 dark:border-red-900/40'}`}>
                    <div className={`text-[1.15rem] font-black ${isReceiptPending ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      ETB {bk.totalPrice?.toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPayBooking && onPayBooking(bk)}
                      className={`py-2 px-4 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition shadow-sm text-white ${
                        isReceiptPending ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <FaCreditCard /> {isReceiptPending ? 'Re-upload / View' : `${t('pay now', 'Pay Now')} →`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBookFirstModal && (
        <div
          onClick={() => setShowBookFirstModal(false)}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-[9999] p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-[480px] w-full p-7 text-center shadow-2xl relative border border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              onClick={() => setShowBookFirstModal(false)}
              className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <FaTimes />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 border-2 border-emerald-200 dark:border-emerald-800">
              <FaBus />
            </div>

            <h3 className="m-0 mb-2 text-[1.28rem] font-black text-slate-900 dark:text-white">
              {t('please book a bus first!', 'Please Book a Bus First!')}
            </h3>

            <p className="m-0 mb-6 text-[0.88rem] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('search & book bus', 'To proceed with payment, please search for available bus schedules, select your departure seats, and complete your reservation.')}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowBookFirstModal(false);
                  if (onSelectBus) onSelectBus();
                }}
                className="w-full p-3.5 bg-[#078930] hover:bg-emerald-700 text-white rounded-2xl font-black text-[0.98rem] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition"
              >
                <FaBus /> {t('search & book bus', 'Search & Book Bus')} <FaArrowRight />
              </button>

              <button
                type="button"
                onClick={() => setShowBookFirstModal(false)}
                className="w-full p-2.5 bg-transparent text-slate-500 dark:text-slate-400 font-bold text-[0.85rem] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCenter;
