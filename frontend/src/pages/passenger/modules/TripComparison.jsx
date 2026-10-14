import React, { useState, useEffect } from 'react';
import { FaBus, FaExchangeAlt, FaStar, FaCheckCircle, FaMoneyBillWave, FaClock, FaFilter } from 'react-icons/fa';
import { scheduleAPI } from '../../../utils/api';
import { useTranslation } from '../../../i18n';

const TripComparison = ({ onSelectSchedule, schedules: propSchedules }) => {
  const { t } = useTranslation();
  const [schedulesList, setSchedulesList] = useState(propSchedules || []);
  const [loading, setLoading] = useState(!propSchedules || propSchedules.length === 0);
  const [filterFrom, setFilterFrom] = useState('all');
  const [filterTo, setFilterTo] = useState('all');
  const [sortBy, setSortBy] = useState('price_asc');

  useEffect(() => {
    if (propSchedules && propSchedules.length > 0) {
      setSchedulesList(propSchedules);
      setLoading(false);
    } else {
      loadSchedules();
    }
  }, [propSchedules]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleAPI.getAll();
      setSchedulesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const origins = ['all', ...new Set(schedulesList.map((s) => s.route?.from).filter(Boolean))];
  const destinations = ['all', ...new Set(schedulesList.map((s) => s.route?.to).filter(Boolean))];

  const filtered = schedulesList.filter((s) => {
    const matchFrom = filterFrom === 'all' || (s.route?.from && s.route.from.toLowerCase() === filterFrom.toLowerCase());
    const matchTo = filterTo === 'all' || (s.route?.to && s.route.to.toLowerCase() === filterTo.toLowerCase());
    return matchFrom && matchTo;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'rating') return (b.companyId?.rating || 0) - (a.companyId?.rating || 0);
    return (a.departureTime || '').localeCompare(b.departureTime || '');
  });

  return (
    <div className="bg-white dark:bg-[#0d1b14] rounded-2xl p-5 border border-slate-200 dark:border-[#1e352b] shadow-sm space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            {t('compare inter-city bus trips', 'Compare Inter-City Bus Trips')}
          </h3>
          <p className="m-0 mt-1 text-slate-500 dark:text-slate-400 text-xs">
            {t('compare participating operators by fare departure time and bus type', 'Compare participating Ethiopian bus operators by fare, departure time, bus type, and ratings')}
          </p>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <select
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none"
          >
            <option value="all">{t('from: all origins', 'From: All Origins')}</option>
            {origins.filter((o) => o !== 'all').map((o) => (
              <option key={o} value={o}>{t('from', 'From')}: {o}</option>
            ))}
          </select>

          <select
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none"
          >
            <option value="all">{t('to: all destinations', 'To: All Destinations')}</option>
            {destinations.filter((d) => d !== 'all').map((d) => (
              <option key={d} value={d}>{t('to', 'To')}: {d}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none"
          >
            <option value="price_asc">{t('price: low to high', 'Price: Low to High')}</option>
            <option value="price_desc">{t('price: high to low', 'Price: High to Low')}</option>
            <option value="rating">{t('top rated operators', 'Top Rated Operators')}</option>
            <option value="time">{t('earliest departure', 'Earliest Departure')}</option>
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            {t('loading live bus schedules...', 'Loading live bus schedules...')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            {t('no bus schedules found matching the selected filters.', 'No bus schedules found matching the selected filters.')}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3">{t('bus operator', 'Bus Operator')}</th>
                <th className="p-3">{t('route & schedule', 'Route & Schedule')}</th>
                <th className="p-3">{t('departure / arrival', 'Departure / Arrival')}</th>
                <th className="p-3">{t('bus type', 'Bus Type')}</th>
                <th className="p-3">{t('available seats', 'Available Seats')}</th>
                <th className="p-3">{t('fare (etb)', 'Fare (ETB)')}</th>
                <th className="p-3">{t('rating', 'Rating')}</th>
                <th className="p-3">{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((s) => {
                const compName = s.companyId?.companyName || 'Ethio Trip Operator';
                const busType = s.bus?.type || s.bus?.busType || 'Luxury Coach';
                const rating = s.companyId?.rating || 4.8;
                const available = s.availableSeats !== undefined ? s.availableSeats : 40;

                return (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5 font-extrabold text-slate-900 dark:text-white">
                        {s.companyId?.logo ? (
                          <img src={s.companyId.logo} alt="" className="w-7 h-7 rounded-md object-contain" />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <FaBus />
                          </div>
                        )}
                        <span>{compName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">{s.route?.from || 'Addis Ababa'} ➔ {s.route?.to || 'Intercity'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('date', 'Date')}: {s.date}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{s.departureTime || '06:00 AM'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('duration', 'Duration')}: {s.route?.duration || 'Approx. 8 hrs'}</div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {busType}
                      </span>
                    </td>
                    <td className={`p-3 font-extrabold ${available > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {available} {t('seats left', 'Seats Left')}
                    </td>
                    <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ETB {Number(s.price || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                        <FaStar /> {rating}
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => onSelectSchedule && onSelectSchedule(s)}
                        className="py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition cursor-pointer shadow-sm"
                      >
                        {t('select seats', 'Select Seats')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TripComparison;
