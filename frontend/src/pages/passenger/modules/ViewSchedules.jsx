import React, { useState, useEffect } from 'react';
import {
  FaBus, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock,
  FaCouch, FaTag, FaCheckCircle, FaFilter, FaArrowRight,
  FaSync, FaExchangeAlt, FaShieldAlt, FaTicketAlt
} from 'react-icons/fa';
import { scheduleAPI, companyAPI } from '../../../utils/api';
import { toast } from 'react-toastify';

import SeatSelectorModal from '../../../components/SeatSelectorModal';
import PaymentModal from '../../../components/PaymentModal';
import TicketModal from '../../../components/TicketModal';
import { CompanyLogoBadge } from './BusSearch';
import { useTranslation } from '../../../i18n';

const CITIES = [
  'All Cities', 'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa',
  'Bahir Dar', 'Gondar', 'Jimma', 'Jijiga', 'Adama', 'Dessie', 'Arba Minch', 'Harar'
];

const ViewSchedules = () => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromCity, setFromCity] = useState('All Cities');
  const [toCity, setToCity] = useState('All Cities');
  const [dateFilter, setDateFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('departure');  

  const [selectedScheduleForSeats, setSelectedScheduleForSeats] = useState(null);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [confirmedBookingForTicket, setConfirmedBookingForTicket] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const [schRes, compRes] = await Promise.allSettled([
        scheduleAPI.getAll(),
        companyAPI.getAll().catch(() => []),
      ]);

      const rawList = schRes.status === 'fulfilled' && Array.isArray(schRes.value)
        ? schRes.value
        : (schRes.status === 'fulfilled' && schRes.value?.schedules ? schRes.value.schedules : []);

      const validSchedules = rawList.filter(s => s.status !== 'cancelled');
      setSchedules(validSchedules);

      if (compRes.status === 'fulfilled' && Array.isArray(compRes.value)) {
        setCompanies(compRes.value);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bus schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSwapCities = () => {
    if (fromCity !== 'All Cities' && toCity !== 'All Cities') {
      const temp = fromCity;
      setFromCity(toCity);
      setToCity(temp);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = schedules.filter((s) => {
    const sFrom = s.route?.from || '';
    const sTo = s.route?.to || '';
    const sDate = s.date || '';
    const sCompId = String(s.companyId?._id || s.companyId || '');

    if (sDate && sDate < todayStr) return false;

    if (fromCity !== 'All Cities' && sFrom.toLowerCase() !== fromCity.toLowerCase()) return false;
    if (toCity !== 'All Cities' && sTo.toLowerCase() !== toCity.toLowerCase()) return false;
    if (dateFilter && sDate !== dateFilter) return false;
    if (companyFilter !== 'ALL' && sCompId !== companyFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'seats') return (b.availableSeats || 0) - (a.availableSeats || 0);
    return (a.departureTime || '').localeCompare(b.departureTime || '');
  });

  const totalSeats = schedules.reduce((acc, s) => acc + (s.availableSeats || 0), 0);
  const minPrice = schedules.length > 0 ? Math.min(...schedules.map(s => s.price || 9999)) : 0;

  return (
    <div className="flex flex-col gap-[18px]">


      {}
      <div className="bg-white rounded-[14px] border border-slate-200 p-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 items-end">
          <div>
            <label className="block text-[0.72rem] font-extrabold text-slate-600 mb-1 uppercase">
              {t('home.from', 'From City')}
            </label>
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="w-full py-[7px] px-2.5 rounded-lg border border-slate-300 text-[0.8rem] bg-white"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c === 'All Cities' ? t('all cities', 'All Cities') : t(c, c)}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleSwapCities}
              title="Swap Cities"
              className="absolute -top-6 right-0 bg-transparent border-none text-sky-600 text-[0.75rem] cursor-pointer font-bold flex items-center gap-1 hover:text-sky-700"
            >
              <FaExchangeAlt /> {t('Swap', 'Swap')}
            </button>
            <label className="block text-[0.72rem] font-extrabold text-slate-600 mb-1 uppercase">
              {t('home.to', 'To Destination')}
            </label>
            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="w-full py-[7px] px-2.5 rounded-lg border border-slate-300 text-[0.8rem] bg-white"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c === 'All Cities' ? t('all cities', 'All Cities') : t(c, c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.72rem] font-extrabold text-slate-600 mb-1 uppercase">
              {t('home.departureDate', 'Travel Date')}
            </label>
            <input
              type="date"
              value={dateFilter}
              min={todayStr}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 text-[0.8rem] box-border"
            />
          </div>

          <div>
            <label className="block text-[0.72rem] font-extrabold text-slate-600 mb-1 uppercase">
              {t('operator', 'Bus Company')}
            </label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full py-[7px] px-2.5 rounded-lg border border-slate-300 text-[0.8rem] bg-white"
            >
              <option value="ALL">{t('all operators', 'All Operators')}</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.72rem] font-extrabold text-slate-600 mb-1 uppercase">
              {t('Sort By', 'Sort By')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-[7px] px-2.5 rounded-lg border border-slate-300 text-[0.8rem] bg-white"
            >
              <option value="departure">{t('Earliest Departure', 'Earliest Departure')}</option>
              <option value="price_low">{t('Price: Low to High', 'Price: Low to High')}</option>
              <option value="price_high">{t('Price: High to Low', 'Price: High to Low')}</option>
              <option value="seats">{t('Most Seats Available', 'Most Seats Available')}</option>
            </select>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFromCity('All Cities');
                setToCity('All Cities');
                setDateFilter('');
                setCompanyFilter('ALL');
                setSortBy('departure');
              }}
              className="flex-1 py-[7px] px-2.5 bg-slate-100 text-slate-600 border-none rounded-lg text-[0.78rem] font-bold cursor-pointer hover:bg-slate-200 transition-colors"
            >
              {t('Reset', 'Reset')}
            </button>
            <button
              type="button"
              onClick={fetchSchedules}
              className="flex-1 py-[7px] px-2.5 bg-sky-600 text-white border-none rounded-lg text-[0.78rem] font-extrabold cursor-pointer inline-flex items-center justify-center gap-1 hover:bg-sky-700 transition-colors"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {}
      <div className="flex justify-between items-center px-1">
        <span className="text-[0.82rem] font-extrabold text-slate-700">
          {t('showing', 'Showing')} {sorted.length} {t('available trips', 'Available Schedule(s)')}
        </span>
        {dateFilter && (
          <span className="text-[0.74rem] bg-sky-100 text-sky-700 py-0.5 px-2 rounded-full font-bold">
            Date: {dateFilter}
          </span>
        )}
      </div>

      {}
      {loading ? (
        <div className="bg-white rounded-[14px] border border-slate-200 p-10 text-center text-slate-400">
          <FaBus className="text-4xl mb-2.5 text-slate-300 mx-auto" />
          <p className="font-bold m-0">Loading available bus schedules...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-slate-200 p-10 text-center text-slate-500">
          <FaCalendarAlt className="text-4xl mb-2.5 text-slate-300 mx-auto" />
          <p className="font-extrabold m-0 mb-1.5 text-slate-900">No matching bus schedules found</p>
          <p className="text-[0.78rem] m-0 text-slate-400">
            Try changing the departure date, selecting "All Cities", or resetting your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
          {sorted.map((sch) => {
            const operatorName = sch.companyId?.companyName || sch.company?.companyName || 'Ethio Trip';
            const busType = sch.bus?.type || 'Standard Luxury';
            const busNumber = sch.bus?.busNumber || 'ETH-BUS';
            const availableCount = sch.availableSeats !== undefined ? sch.availableSeats : 35;
            const isSeatsLow = availableCount <= 5;
            const isFull = availableCount === 0;

            return (
              <div
                key={sch._id}
                className="bg-white rounded-[14px] border border-slate-200 p-4 flex flex-col justify-between shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all"
              >
                <div>
                  {}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogoBadge companyName={operatorName} logo={sch.companyId?.logo} size={40} />
                      <div>
                        <div className="font-extrabold text-[0.86rem] text-slate-900 leading-tight">
                          {operatorName}
                        </div>
                        <div className="text-[0.68rem] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{busType}</span>
                          <span>•</span>
                          <span>{busNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[1.05rem] font-black text-[#078930]">
                        ETB {sch.price}
                      </div>
                      <div className="text-[0.65rem] text-slate-400">{t('per seat', 'per seat')}</div>
                    </div>
                  </div>

                  {}
                  <div className="bg-slate-50 rounded-[10px] py-2.5 px-3 mb-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-extrabold text-[0.85rem] text-slate-900">
                        {sch.route?.from || 'Origin'}
                      </div>
                      <FaArrowRight className="text-sky-600 text-[0.75rem]" />
                      <div className="font-extrabold text-[0.85rem] text-slate-900">
                        {sch.route?.to || 'Destination'}
                      </div>
                    </div>

                    <div className="flex justify-between text-[0.72rem] text-slate-500">
                      <div className="flex items-center gap-1">
                        <FaClock className="text-sky-600" />
                        <span>{t('Dep:', 'Dep:')} <strong>{sch.departureTime || '06:00 AM'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="text-green-600" />
                        <span>{t('Arr:', 'Arr:')} <strong>{sch.arrivalTime || '02:00 PM'}</strong></span>
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[0.7rem] text-slate-600 flex justify-between">
                      <span>📅 {t('date', 'Date')}: <strong>{sch.date || t('Today', 'Today')}</strong></span>
                      <span>{t('boarding station', 'Boarding')}: <strong>{sch.pickupStation || sch.route?.pickupStation || 'Central Terminal'}</strong></span>
                    </div>
                  </div>
                </div>

                {}
                <div className="flex items-center justify-between gap-2 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <FaCouch className={isFull ? 'text-red-600' : isSeatsLow ? 'text-amber-600' : 'text-green-600'} />
                    <span
                      className={`text-[0.74rem] font-extrabold py-0.5 px-2 rounded-full ${
                        isFull
                          ? 'text-red-600 bg-red-100'
                          : isSeatsLow
                            ? 'text-amber-700 bg-amber-100'
                            : 'text-green-700 bg-green-100'
                      }`}
                    >
                      {isFull ? t('Sold Out', 'Sold Out') : `${availableCount} ${t('Seats Open', 'Seats Open')}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedScheduleForSeats(sch)}
                    disabled={isFull}
                    className={`py-2 px-4 rounded-lg text-[0.78rem] font-extrabold cursor-pointer inline-flex items-center gap-1.5 border-none transition-all ${
                      isFull
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-br from-[#078930] to-[#066d26] text-white shadow-[0_2px_5px_rgba(7,137,48,0.25)] hover:brightness-105'
                    }`}
                  >
                    <FaCouch /> {t('select seat & book', 'Select Seat & Book')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      {selectedScheduleForSeats && (
        <SeatSelectorModal
          schedule={selectedScheduleForSeats}
          onClose={() => setSelectedScheduleForSeats(null)}
          onBookingComplete={(createdBooking) => {
            setSelectedScheduleForSeats(null);
            setActiveBookingForPayment(createdBooking);
          }}
        />
      )}

      {}
      {activeBookingForPayment && (
        <PaymentModal
          booking={activeBookingForPayment}
          onClose={() => setActiveBookingForPayment(null)}
          onSuccess={(paidBooking) => {
            setActiveBookingForPayment(null);
            setConfirmedBookingForTicket(paidBooking);
            fetchSchedules();  
          }}
        />
      )}

      {}
      {confirmedBookingForTicket && (
        <TicketModal
          booking={confirmedBookingForTicket}
          onClose={() => setConfirmedBookingForTicket(null)}
        />
      )}
    </div>
  );
};

export default ViewSchedules;
