import React, { useState, useEffect } from 'react';
import { scheduleAPI, ticketAPI, busAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import {
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaSearch,
  FaBus,
  FaExclamationCircle,
} from 'react-icons/fa';
import { useTranslation } from '../../../i18n';

const TripPassengerVerification = () => {
  const { t } = useTranslation();
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
  const [boardingFilter, setBoardingFilter] = useState('ALL');

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
    } catch {
      toast.error(t('agent.loadSchedulesFailed', 'Failed to load company trip schedules.'));
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
      setPassengers(data.manifest || data.passengers || []);
    } catch (err) {
      toast.error(err.message || t('agent.fetchManifestFailed', 'Failed to fetch trip passenger manifest.'));
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
      await ticketAPI.agentVerify({
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: 'VERIFIED',
      });
      toast.success(`${t('ticket.ticketNumber', 'Ticket')} ${ticket.ticketNumber} ${t('booking.verified', 'VERIFIED')} ${t('agent.forPax', 'for')} ${ticket.passengerName}`);
      fetchPassengers(selectedScheduleId);
    } catch (err) {
      toast.error(err.message || t('agent.verifyFailed', 'Failed to verify ticket'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejection = (ticket) => {
    setRejectionModalTicket(ticket);
    setRejectionReason(t('agent.defaultRejectReason', 'ID or Name mismatch at counter'));
  };

  const handleConfirmRejection = async () => {
    if (!rejectionModalTicket) return;
    try {
      setActionLoadingId(rejectionModalTicket._id);
      await ticketAPI.agentVerify({
        ticketId: rejectionModalTicket._id,
        ticketNumber: rejectionModalTicket.ticketNumber,
        status: 'REJECTED',
        rejectionReason: rejectionReason || t('agent.rejectedAtCounter', 'Rejected by ticket agent at counter'),
      });
      toast.warn(`${t('ticket.ticketNumber', 'Ticket')} ${rejectionModalTicket.ticketNumber} ${t('agent.markedRejected', 'marked as REJECTED.')}`);
      setRejectionModalTicket(null);
      setRejectionReason('');
      fetchPassengers(selectedScheduleId);
    } catch (err) {
      toast.error(err.message || t('agent.rejectFailed', 'Failed to reject ticket'));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mod-wrapper">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="m-0 text-[1.35rem] font-black text-slate-900 flex items-center gap-2.5">
            <FaShieldAlt className="text-eb-green" /> {t('agent.verifyTitle', 'Trip Passenger Ticket Validity Verification')}
          </h2>
          <p className="mt-1 mb-0 text-[0.84rem] text-slate-500">
            {t('agent.verifySub', 'Select a trip to inspect passenger tickets and authorize validity before boarding.')}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-[18px] mb-5 shadow-sm">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              <FaBus className="inline mr-1" /> {t('agent.selectTripSchedule', 'Select Trip / Schedule')}
            </label>
            <select
              value={selectedScheduleId}
              onChange={handleScheduleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-[13px] font-semibold bg-white text-slate-800 focus:outline-none focus:border-eb-green"
            >
              {schedules.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.tripId || 'TRP'} • {t(s.route?.from, s.route?.from)} → {t(s.route?.to, s.route?.to)} ({s.date} @ {s.departureTime})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => fetchPassengers(selectedScheduleId)}
              disabled={loadingPassengers || !selectedScheduleId}
              className="bg-green-700 hover:bg-green-800 text-white border-0 px-[18px] py-2.5 rounded-lg font-semibold text-[13px] cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSearch /> {t('agent.refreshManifest', 'Refresh Manifest')}
            </button>
          </div>
        </div>
      </div>

      {manifestData && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-5">
          <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 text-center shadow-sm">
            <span className="text-xs text-slate-500">{t('agent.totalPassengers', 'Total Passengers')}</span>
            <div className="text-xl font-bold text-slate-800">{manifestData.totalPassengers}</div>
          </div>
          <div className="bg-emerald-50 p-3.5 rounded-[10px] border border-emerald-200 text-center">
            <span className="text-xs text-emerald-600 font-medium">{t('agent.boardedPax', 'Boarded Passengers')}</span>
            <div className="text-xl font-extrabold text-emerald-600">{manifestData.boardedCount || 0}</div>
          </div>
          <div className="bg-amber-50 p-3.5 rounded-[10px] border border-amber-200 text-center">
            <span className="text-xs text-amber-700 font-medium">{t('agent.awaitingBoarding', 'Awaiting Boarding')}</span>
            <div className="text-xl font-extrabold text-amber-600">{manifestData.notBoardedCount || 0}</div>
          </div>
          <div className="bg-green-50 p-3.5 rounded-[10px] border border-green-200 text-center">
            <span className="text-xs text-green-800 font-medium">{t('agent.verifiedTickets', 'Verified Tickets')}</span>
            <div className="text-xl font-bold text-green-700">{manifestData.verifiedCount}</div>
          </div>
          <div className="bg-red-50 p-3.5 rounded-[10px] border border-red-200 text-center">
            <span className="text-xs text-red-800 font-medium">{t('agent.rejected', 'Rejected')}</span>
            <div className="text-xl font-bold text-red-700">{manifestData.rejectedCount}</div>
          </div>
        </div>
      )}

      {manifestData && (
        <div className="flex gap-2 mb-3.5 flex-wrap">
          {[
            { id: 'ALL', label: `${t('common.all', 'All')} (${passengers.length})` },
            { id: 'BOARDED', label: `${t('booking.boarded', 'Boarded')} (${manifestData.boardedCount || 0})` },
            { id: 'NOT_BOARDED', label: `${t('booking.notBoarded', 'Not Boarded')} (${manifestData.notBoardedCount || 0})` },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setBoardingFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-extrabold cursor-pointer transition-colors ${
                boardingFilter === f.id
                  ? f.id === 'BOARDED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                    : f.id === 'NOT_BOARDED'
                    ? 'border-amber-500 bg-amber-50 text-amber-600'
                    : 'border-eb-green bg-emerald-50 text-eb-green'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loadingPassengers ? (
          <div className="p-10 text-center text-slate-500 font-medium">{t('common.loading', 'Loading passenger list...')}</div>
        ) : filteredPassengers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-medium">
            {t('agent.noPassengersMatchFilter', 'No passengers found matching your filter on this trip.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-left text-slate-600 font-semibold">
                  <th className="py-3 px-4">{t('booking.seat', 'Seat')}</th>
                  <th className="py-3 px-4">{t('forms.fullName', 'Passenger Name')}</th>
                  <th className="py-3 px-4">{t('forms.phone', 'Phone Number')}</th>
                  <th className="py-3 px-4">{t('ticket.ticketNumber', 'Ticket Number')}</th>
                  <th className="py-3 px-4">{t('payment.payment', 'Payment')}</th>
                  <th className="py-3 px-4">{t('agent.agentVerification', 'Agent Verification')}</th>
                  <th className="py-3 px-4">{t('booking.boardingStatus', 'Boarding Status')}</th>
                  <th className="py-3 px-4 text-center">{t('common.actions', 'Counter Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassengers.map((p) => {
                  const isVerified = p.verificationStatus === 'VERIFIED';
                  const isRejected = p.verificationStatus === 'REJECTED';
                  const isBoarded = p.boardingStatus === 'BOARDED';
                  const isLoading = actionLoadingId === p._id;

                  return (
                    <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-green-700">{p.seatNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.passengerName}</td>
                      <td className="py-3 px-4 text-slate-500">{p.passengerPhone || p.user?.phone || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.ticketNumber}</td>
                      <td className="py-3 px-4">
                        {p.booking?.paymentStatus === 'PAID' || p.paymentStatus === 'PAID' ? (
                          <span className="text-green-700 font-semibold bg-green-100 px-1.5 py-0.5 rounded text-[11px]">
                            {t('payment.paid', 'PAID')}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                            {p.booking?.paymentStatus || t('payment.pending', 'PENDING')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border inline-block ${
                          isVerified ? 'bg-green-100 text-green-700 border-green-300' : isRejected ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}>
                          {p.verificationStatus || t('common.pending', 'PENDING')}
                        </span>
                        {isRejected && p.rejectionReason && (
                          <div className="text-[11px] text-red-600 mt-0.5">{p.rejectionReason}</div>
                        )}
                        {isVerified && p.verifiedBy && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{t('agent.by', 'By')}: {p.verifiedBy?.name || t('ticket agent', 'Agent')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border inline-flex items-center gap-1 ${
                          isBoarded ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-300'
                        }`}>
                          {isBoarded ? `✓ ${t('booking.boarded', 'BOARDED')}` : `○ ${t('booking.notBoarded', 'NOT BOARDED')}`}
                        </span>
                        {isBoarded && p.boardedAt && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(p.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleVerifyTicket(p)}
                            disabled={isLoading || isVerified}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors border-0 ${
                              isVerified ? 'bg-slate-200 text-slate-400 cursor-default' : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <FaCheck /> {isVerified ? t('agent.verified', 'Verified') : t('agent.verify', 'Verify')}
                          </button>

                          <button
                            onClick={() => handleOpenRejection(p)}
                            disabled={isLoading || isRejected}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors border-0 ${
                              isRejected ? 'bg-slate-200 text-slate-400 cursor-default' : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <FaTimes /> {t('agent.reject', 'Reject')}
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

      {rejectionModalTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[14px] p-6 max-w-[440px] w-full shadow-2xl">
            <h3 className="m-0 mb-2.5 text-[17px] text-red-800 flex items-center gap-2 font-bold">
              <FaExclamationCircle /> {t('agent.rejectValidityTitle', 'Reject Ticket Validity')}
            </h3>
            <p className="text-[13px] text-slate-600 mb-3.5">
              {t('agent.rejectValiditySub', 'Specify the reason for rejecting ticket')} <strong>{rejectionModalTicket.ticketNumber}</strong> {t('agent.forPax', 'for passenger')} <strong>{rejectionModalTicket.passengerName}</strong>:
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder=""
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-[13px] mb-4 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setRejectionModalTicket(null)}
                className="bg-slate-100 hover:bg-slate-200 border-0 px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer text-slate-700 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmRejection}
                className="bg-red-600 hover:bg-red-700 text-white border-0 px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-colors"
              >
                {t('agent.confirmRejection', 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPassengerVerification;
