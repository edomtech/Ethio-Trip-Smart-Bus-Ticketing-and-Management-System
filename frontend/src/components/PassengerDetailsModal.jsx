import React from 'react';
import {
  FaTimes, FaUser, FaPhone, FaBus, FaCalendarAlt, FaClock,
  FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle, FaQrcode,
  FaTicketAlt, FaShieldAlt, FaMoneyBillWave
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

const PassengerDetailsModal = ({ passenger, trip, onClose, onScanToBoard }) => {
  if (!passenger) return null;

  const isAgentVerified = passenger.verificationStatus === 'VERIFIED';
  const isBoarded = passenger.boardingStatus === 'BOARDED';
  const qrString = `ETHIOTRIP:${passenger.ticketNumber || passenger._id}:${passenger.seatNumber}`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-5 sm:px-6 text-white flex justify-between items-center">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold">
              Passenger Booking Details
            </div>
            <div className="text-lg sm:text-xl font-extrabold mt-0.5 flex items-center gap-2">
              <FaTicketAlt className="text-sky-400" /> {passenger.passengerName || 'Passenger'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"
          >
            <FaTimes />
          </button>
        </div>

        {}
        <div className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {}
            <div
              className={`p-3.5 rounded-xl border ${
                isAgentVerified
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase ${isAgentVerified ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                Agent Verification
              </div>
              <div className={`flex items-center gap-1.5 font-extrabold text-sm mt-0.5 ${isAgentVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isAgentVerified ? <FaCheckCircle /> : <FaExclamationTriangle />}
                {passenger.verificationStatus || 'PENDING'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {isAgentVerified ? `Verified by ${passenger.verifiedBy?.name || 'Counter Agent'}` : 'Requires verification at ticket counter'}
              </div>
            </div>

            {}
            <div
              className={`p-3.5 rounded-xl border ${
                isBoarded
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase ${isBoarded ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                Boarding Status
              </div>
              <div className={`flex items-center gap-1.5 font-extrabold text-sm mt-0.5 ${isBoarded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {isBoarded ? <FaCheckCircle /> : <FaBus />}
                {passenger.boardingStatus || 'NOT_BOARDED'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {isBoarded ? `Boarded ${passenger.boardedAt ? new Date(passenger.boardedAt).toLocaleTimeString() : 'at departure'}` : 'Awaiting ticket scan to board'}
              </div>
            </div>
          </div>

          {}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Passenger Full Name</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <FaUser className="text-indigo-500" /> {passenger.passengerName}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Contact Phone</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <FaPhone className="text-emerald-500" /> {passenger.passengerPhone || passenger.user?.phone || '0911223344'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Assigned Seat</div>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Seat {passenger.seatNumber}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Ticket Number</div>
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {passenger.ticketNumber}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4.5">
            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-3 flex items-center gap-1.5">
              <FaBus className="text-indigo-600 dark:text-indigo-400" /> Trip &amp; Travel Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-slate-400">Route</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip?.route?.from || 'Addis Ababa'} → {trip?.route?.to || 'Destination'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Date &amp; Departure</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip?.date || 'Today'} ({trip?.departureTime || '06:00 AM'})
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Bus / Coach</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip?.bus?.busNumber || 'Assigned Coach'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Ticket Fare</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ETB {passenger.price || trip?.price || 950} (PAID)
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
            <div className="bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <QRCodeSVG value={qrString} size={76} level="M" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Digital Boarding Pass QR
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {isBoarded
                  ? 'Passenger is boarded. This boarding pass is marked as used.'
                  : isAgentVerified
                  ? 'Ready for boarding! Conductor must scan QR code at the bus door to board.'
                  : 'Ticket is waiting for Agent verification. Direct boarding is prohibited until verified.'}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/60 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs cursor-pointer transition"
          >
            Close
          </button>

          {!isBoarded && (
            <button
              onClick={() => {
                onClose();
                if (onScanToBoard) onScanToBoard(passenger);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white flex items-center gap-2 cursor-pointer transition shadow-md ${
                isAgentVerified
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                  : 'bg-slate-600 hover:bg-slate-700'
              }`}
            >
              <FaQrcode /> Scan QR to Confirm Boarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerDetailsModal;
