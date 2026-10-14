import React, { useState, useEffect } from 'react';
import {
  FaBus, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock,
  FaTimes, FaEye, FaSync, FaTrash
} from 'react-icons/fa';
import { scheduleAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const ROWS = [
  { key: 1,  left: [1],       right: [2, 3] },
  { key: 2,  left: [4, 5],    right: [6, 7] },
  { key: 3,  left: [8, 9],    right: [10, 11] },
  { key: 4,  left: [12, 13],  right: [14, 15] },
  { key: 5,  left: [16, 17],  right: [18, 19] },
  { key: 6,  left: [20, 21],  right: [22, 23] },
  { key: 7,  left: [24, 25],  right: [26, 27] },
  { key: 8,  left: [28, 29],  right: [30, 31] },
  { key: 9,  left: [32, 33],  right: [34, 35] },
  { key: 10, left: [36, 37],  right: [38, 39] },
  { key: 11, left: [40, 41],  right: [42, 43] },
  { key: 12, left: [44],      right: [45], isBack: true },
];

const DEFAULT_CITIES = [
  'All Cities', 'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa',
  'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga',
];

const SeatView = ({ num, bookedSeats, t }) => {
  const isBooked = bookedSeats.includes(num) || bookedSeats.includes(String(num));
  return (
    <div
      title={isBooked ? `${t('booking.seat', 'Seat')} ${num} – ${t('booking.reserved', 'Reserved')}` : `${t('booking.seat', 'Seat')} ${num} – ${t('booking.available', 'Available')}`}
      className={`w-[38px] h-[34px] rounded-lg border-[1.5px] font-extrabold text-[0.82rem] flex items-center justify-center shrink-0 cursor-default shadow-sm ${
        isBooked
          ? 'border-slate-400 bg-slate-300 text-slate-500'
          : 'border-slate-300 bg-white text-slate-800'
      }`}
    >
      {num}
    </div>
  );
};

const SeatLayoutModal = ({ schedule, onClose }) => {
  const { t } = useTranslation();
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const fresh = await scheduleAPI.getById(schedule._id);
        const raw = fresh?.bookedSeats || schedule?.bookedSeats || [];
        setBookedSeats(raw.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
      } catch {
        const raw = schedule?.bookedSeats || [];
        setBookedSeats(raw.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schedule._id]);

  const cap = schedule?.bus?.totalSeats || schedule?.bus?.capacity || 45;
  const reserved = bookedSeats.length;
  const available = Math.max(0, cap - reserved);
  const pct = Math.min(100, Math.round((reserved / cap) * 100));

  const renderSeatCol = (seats) =>
    seats.map(n => <SeatView key={n} num={n} bookedSeats={bookedSeats} t={t} />);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[20px] w-full max-w-[520px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="bg-gradient-to-br from-[#064e3b] to-[#065f46] py-[18px] px-5 flex justify-between items-start shrink-0">
          <div>
            <div className="text-[0.68rem] text-white/70 font-bold mb-1">
              {t('agent.seatAvailabilityTitle', 'SEAT AVAILABILITY · VIEW ONLY')}
            </div>
            <div className="text-[1.2rem] font-black text-white">
              {t(schedule?.route?.from, schedule?.route?.from || '—')} → {t(schedule?.route?.to, schedule?.route?.to || '—')}
            </div>
            <div className="text-[0.78rem] text-white/75 mt-1">
              {t('admin.bus', 'Bus')} {schedule?.bus?.busNumber} ({schedule?.bus?.type || 'Luxury'}) · {schedule?.date} · {schedule?.departureTime}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white/15 hover:bg-white/25 text-white border-0 rounded-lg w-[34px] h-[34px] flex items-center justify-center cursor-pointer text-base shrink-0 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="py-3 px-5 border-b border-slate-100 shrink-0">
          <div className="flex justify-between text-[0.78rem] font-bold mb-1.5 text-slate-500">
            <span>
              {t('booking.reserved', 'Reserved')}: <span className="text-red-600 font-black">{reserved}</span>
            </span>
            <span>
              {t('booking.available', 'Available')}: <span className="text-green-600 font-black">{available}</span>
            </span>
            <span>
              {t('common.total', 'Total')}: <strong className="text-slate-700">{cap}</strong>
            </span>
          </div>
          <div className="h-[7px] bg-slate-200 rounded overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className={`h-full rounded transition-[width] duration-300 ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>

        <div className="py-2.5 px-5 flex gap-4 shrink-0">
          {[
            { label: t('booking.available', 'Available'), isAvail: true },
            { label: t('booking.reserved', 'Reserved'), isAvail: false },
          ].map(({ label, isAvail }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-3.5 rounded border-[1.5px] ${isAvail ? 'bg-white border-slate-300' : 'bg-slate-300 border-slate-400'}`} />
              <span className="text-[0.72rem] text-slate-600 font-semibold">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="text-center py-10 text-slate-500 font-medium">{t('agent.loadingSeatMap', 'Loading seat map...')}</div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border-[1.5px] border-slate-200 p-4 flex flex-col">
              <div className="bg-gradient-to-r from-[#064e3b] to-[#065f46] rounded-t-xl py-2.5 px-4 flex justify-between items-center mb-3">
                <span className="text-white font-black text-[0.82rem]">🚌 {t('booking.driver', 'DRIVER')}</span>
                <div className="w-9 h-7 bg-white/20 rounded-lg border-[1.5px] border-white/30" />
              </div>

              <div className="flex flex-col gap-1.5">
                {ROWS.map(row => (
                  <div key={row.key} className="flex justify-between items-center gap-1">
                    <div className="flex gap-1">{renderSeatCol(row.left)}</div>
                    <div className="w-7 text-center text-[0.6rem] text-slate-400">
                      {row.isBack ? '━━' : ''}
                    </div>
                    <div className="flex gap-1">{renderSeatCol(row.right)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SeatAvailability = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notify = useNotification();
  const companyId = user?.companyId?._id || user?.companyId;

  const [from, setFrom] = useState('All Cities');
  const [to, setTo] = useState('All Cities');
  const [date, setDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewSchedule, setViewSchedule] = useState(null);

  const [cityList, setCityList] = useState(DEFAULT_CITIES);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await scheduleAPI.getAll();
      const all = Array.isArray(data) ? data : (data?.schedules || []);
      const companySchedules = companyId
        ? all.filter(s => {
            const sCompId = s.companyId?._id || s.companyId;
            return String(sCompId) === String(companyId);
          })
        : all;

      setSchedules(companySchedules);

      const origins = new Set();
      const destinations = new Set();
      companySchedules.forEach(s => {
        if (s.route?.from) origins.add(s.route.from);
        if (s.route?.to) destinations.add(s.route.to);
      });
      const merged = Array.from(new Set(['All Cities', ...DEFAULT_CITIES.slice(1), ...origins, ...destinations]));
      setCityList(merged);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports?.loadFailed || t('admin.loadFailed', 'Failed to load schedules'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [companyId]);

  const handleDeleteSchedule = async (schedule) => {
    const id = schedule?._id || schedule;
    const label = schedule
      ? `${schedule.route?.from || '?'} → ${schedule.route?.to || '?'}${schedule.tripId ? ` (${schedule.tripId})` : ''}`
      : '';

    const confirmed = await notify.confirm({
      title: t('agent.removeMonitorTitle', 'Remove From Monitor?'),
      message: `${t('agent.removeMonitorConfirm', 'Are you sure you want to remove this schedule')} ${label ? `"${label}"` : ''} ${t('agent.fromMonitor', 'from your seat availability monitor?')}`,
      description: t('agent.removeMonitorDesc', 'The schedule itself is not deleted. It will simply be hidden from this monitor list.'),
      confirmLabel: t('common.remove', 'Remove'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setSchedules(prev => prev.filter(s => s._id !== id));
  };

  const filteredSchedules = schedules.filter(s => {
    const q = searchKeyword.toLowerCase().trim();

    const busNum = (s.bus?.busNumber || '').toLowerCase();
    const busPlate = (s.bus?.plateNumber || '').toLowerCase();
    const busType = (s.bus?.type || '').toLowerCase();
    const busName = (s.bus?.name || '').toLowerCase();

    const rFrom = (s.route?.from || '').toLowerCase();
    const rTo = (s.route?.to || '').toLowerCase();
    const pickup = (s.pickupStation || s.route?.pickupStation || '').toLowerCase();
    const dropoff = (s.dropoffStation || s.route?.dropoffStation || '').toLowerCase();

    const sDate = (s.date || '').toLowerCase();
    const sTime = (s.departureTime || '').toLowerCase();

    const matchesKeyword = !q ||
      busNum.includes(q) ||
      busPlate.includes(q) ||
      busType.includes(q) ||
      busName.includes(q) ||
      rFrom.includes(q) ||
      rTo.includes(q) ||
      pickup.includes(q) ||
      dropoff.includes(q) ||
      sDate.includes(q) ||
      sTime.includes(q);

    const matchesFrom = from === 'All Cities' || s.route?.from?.toLowerCase() === from.toLowerCase();
    const matchesTo = to === 'All Cities' || s.route?.to?.toLowerCase() === to.toLowerCase();
    const matchesDate = !date || s.date === date;

    return matchesKeyword && matchesFrom && matchesTo && matchesDate;
  });

  const labelClass = "block text-[0.72rem] font-extrabold text-slate-600 mb-1";
  const inputClass = "w-full px-3 py-[9px] rounded-lg border-[1.5px] border-slate-300 text-[0.87rem] outline-none bg-white text-slate-900 focus:border-eb-green transition-colors";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="m-0 font-black text-[1.35rem] text-slate-900 flex items-center gap-2.5">
            <FaEye className="text-eb-green" /> {t('agent.seatAvailability', 'Seat Availability Monitor')}
          </h2>
          <p className="mt-1 mb-0 text-slate-500 text-[0.84rem]">
            {t('agent.seatAvailabilitySub', 'Monitor real-time seat reservation layout and capacity across scheduled company buses.')}
          </p>
        </div>
        <button
          onClick={fetchSchedules}
          disabled={loading}
          className="py-[9px] px-[18px] bg-eb-green hover:bg-[#067328] text-white border-0 rounded-lg font-extrabold text-[0.84rem] cursor-pointer flex items-center gap-[7px] shadow-[0_2px_8px_rgba(7,137,48,0.2)] transition-colors disabled:opacity-50"
        >
          <FaSync className={loading ? 'fa-spin' : ''} /> {t('agent.refreshAvailability', 'Refresh Availability')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
          <div className="col-span-1 sm:col-span-2">
            <label className={labelClass}>{t('agent.searchBusFilter', 'Search by Bus Name / Number / Plate / Route')}</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t('agent.searchBusPlaceholder', 'Search bus number, plate, route or departure time...')}
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('booking.fromOrigin', 'Origin')}</label>
            <select value={from} onChange={e => setFrom(e.target.value)} className={inputClass}>
              {cityList.map(c => <option key={c} value={c}>{c === 'All Cities' ? t('common.allCities', 'All Cities') : t(c, c)}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('booking.toDestination', 'Destination')}</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={inputClass}>
              {cityList.map(c => <option key={c} value={c}>{c === 'All Cities' ? t('common.allCities', 'All Cities') : t(c, c)}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('booking.departureDate', 'Departure Date')}</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {(searchKeyword || from !== 'All Cities' || to !== 'All Cities' || date) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setFrom('All Cities');
                setTo('All Cities');
                setDate('');
              }}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md py-1.5 px-3 text-[0.78rem] text-slate-600 cursor-pointer font-bold transition-colors"
            >
              {t('common.clearFilters', 'Clear Filters')}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 text-[0.82rem] text-slate-500 font-bold">
          {filteredSchedules.length} {t('agent.schedulesAvailable', 'schedules available')}
        </div>

        {loading ? (
          <div className="text-center py-16 px-5 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
            <FaSync className="fa-spin text-[2rem] text-eb-green mb-3 mx-auto" />
            <p className="m-0 font-bold">{t('agent.loadingSeatData', 'Loading seat availability data...')}</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="text-center py-12 px-5 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
            <FaBus className="text-[2.5rem] text-slate-300 mb-3 mx-auto" />
            <h4 className="m-0 mb-1 text-slate-700 font-bold">{t('agent.noSchedulesMatch', 'No schedules match search')}</h4>
            <p className="m-0 text-[0.82rem]">
              {t('agent.tryDifferentSearch', 'Try searching with a different bus name, route, or clear your filters.')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredSchedules.map(sch => {
              const cap = sch.bus?.totalSeats || sch.bus?.capacity || 45;
              const booked = (sch.bookedSeats || []).length;
              const available = Math.max(0, cap - booked);
              const pct = Math.min(100, Math.round((booked / cap) * 100));

              return (
                <div
                  key={sch._id}
                  className="bg-white rounded-[14px] border-[1.5px] border-slate-200 p-[18px] shadow-sm"
                >
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div className="flex items-center gap-3.5 flex-1 min-w-[280px]">
                      <div className="w-[46px] h-[46px] rounded-xl bg-green-50 text-eb-green flex items-center justify-center text-xl shrink-0">
                        <FaBus />
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-slate-900 text-base mb-1 flex items-center gap-2 flex-wrap">
                          <span>{t('admin.bus', 'Bus')} {sch.bus?.busNumber}</span>
                          <span className="text-[0.75rem] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {sch.bus?.type || 'Luxury'}
                          </span>
                          {sch.bus?.plateNumber && (
                            <span className="text-[0.72rem] text-slate-500">
                              {t('admin.plate', 'Plate')}: {sch.bus.plateNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[0.78rem] text-slate-500 flex gap-3.5 flex-wrap mb-1">
                          <span><FaMapMarkerAlt className="text-eb-green mr-1 inline" />
                            {t(sch.route?.from, sch.route?.from || 'Origin')} → {t(sch.route?.to, sch.route?.to || 'Destination')}
                          </span>
                          <span><FaCalendarAlt className="text-eb-green mr-1 inline" />{sch.date}</span>
                          <span><FaClock className="text-eb-green mr-1 inline" />{sch.departureTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5">
                      <div className="flex gap-3 items-center">
                        <div className="text-center">
                          <div className="text-[1.4rem] font-black text-red-600 leading-none">{booked}</div>
                          <div className="text-[0.65rem] text-slate-500 font-bold uppercase">{t('booking.reserved', 'RESERVED')}</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <div className="text-[1.4rem] font-black text-green-600 leading-none">{available}</div>
                          <div className="text-[0.65rem] text-slate-500 font-bold uppercase">{t('booking.available', 'AVAILABLE')}</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <div className="text-[1.4rem] font-black text-slate-700 leading-none">{cap}</div>
                          <div className="text-[0.65rem] text-slate-500 font-bold uppercase">{t('common.total', 'TOTAL')}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setViewSchedule(sch)}
                          className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white border-0 rounded-lg font-extrabold text-[0.82rem] cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <FaEye /> {t('agent.viewLayout', 'View Layout')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch)}
                          aria-label={`Remove schedule ${sch.tripId || ''} from monitor`}
                          className="py-2 px-3 bg-white hover:bg-red-50 text-red-600 border-[1.5px] border-red-200 rounded-lg font-extrabold text-[0.82rem] cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <FaTrash /> {t('common.remove', 'Remove')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex justify-between text-[0.7rem] text-slate-400 mb-1">
                      <span>0%</span>
                      <span className={`font-bold ${pct > 85 ? 'text-red-600' : pct > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}% {t('agent.occupied', 'Occupied')}</span>
                      <span>100%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded transition-[width] duration-300 ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewSchedule && (
        <SeatLayoutModal
          schedule={viewSchedule}
          onClose={() => setViewSchedule(null)}
        />
      )}
    </div>
  );
};

export default SeatAvailability;
