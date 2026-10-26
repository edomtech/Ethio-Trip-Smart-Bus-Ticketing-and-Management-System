import React, { useState, useEffect } from 'react';
import { bookingAPI, userAPI } from '../../../utils/api';
import { FaUsers, FaSearch, FaEnvelope, FaPhone, FaTicketAlt, FaSync } from 'react-icons/fa';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const AdminPassengers = () => {
  const { t } = useTranslation();
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const [bookings, users] = await Promise.all([
        bookingAPI.getAll().catch(() => []),
        userAPI.getAll({ role: 'passenger' }).catch(() => []),
      ]);

      const passengerMap = new Map();
      const userList = Array.isArray(users) ? users : users?.users || [];

      // First populate from registered DB users
      userList.forEach((u) => {
        const idKey = u._id ? u._id.toString() : (u.email || '').toLowerCase();
        if (!idKey) return;
        passengerMap.set(idKey, {
          id: idKey,
          name: u.name || 'Passenger',
          email: u.email || '—',
          phone: u.phone || '—',
          nationalId: u.nationalId || '—',
          city: u.city || '—',
          totalBookings: 0,
          lastBookingDate: null,
          registeredDate: u.createdAt,
          isRegistered: true,
        });
      });

      // Match bookings to update total bookings and last active date
      (bookings || []).forEach((b) => {
        const userId = (b.user?._id || b.user)?.toString();
        const email = (b.passenger?.email || b.user?.email || '').toLowerCase();
        const phone = b.passenger?.phone || b.user?.phone || '';
        const nationalId = b.passenger?.nationalId || b.passenger?.idNumber || '';

        let p = null;
        if (userId && passengerMap.has(userId)) {
          p = passengerMap.get(userId);
        } else if (email && passengerMap.has(email)) {
          p = passengerMap.get(email);
        }

        if (p) {
          p.totalBookings += 1;
          if (nationalId && (!p.nationalId || p.nationalId === '—')) p.nationalId = nationalId;
          if (b.passenger?.city && (!p.city || p.city === '—')) p.city = b.passenger.city;
          if (new Date(b.createdAt) > new Date(p.lastBookingDate || 0)) {
            p.lastBookingDate = b.createdAt;
          }
        } else {
          const guestKey = (email || phone || b._id).toString().toLowerCase();
          if (!passengerMap.has(guestKey)) {
            passengerMap.set(guestKey, {
              id: guestKey,
              name: b.passenger?.name || 'Guest Passenger',
              email: email || '—',
              phone: phone || '—',
              nationalId: nationalId || '—',
              city: b.passenger?.city || '—',
              totalBookings: 1,
              lastBookingDate: b.createdAt,
              registeredDate: b.createdAt,
              isRegistered: false,
            });
          } else {
            const guest = passengerMap.get(guestKey);
            guest.totalBookings += 1;
            if (nationalId && (!guest.nationalId || guest.nationalId === '—')) guest.nationalId = nationalId;
            if (new Date(b.createdAt) > new Date(guest.lastBookingDate || 0)) {
              guest.lastBookingDate = b.createdAt;
            }
          }
        }
      });

      setPassengers(Array.from(passengerMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, []);

  const filteredPassengers = passengers.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.nationalId && p.nationalId.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    if (startDate) {
      if (!p.registeredDate || new Date(p.registeredDate) < new Date(startDate)) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!p.registeredDate || new Date(p.registeredDate) > end) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap bg-white p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {t('filter by registration date', 'Filter by Registration Date')}:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 outline-none"
            title="Start Registration Date"
          />
          <span className="text-xs text-slate-400">{t('to', 'to')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 outline-none"
            title="End Registration Date"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 bg-slate-100 rounded cursor-pointer"
            >
              {t('clear dates', 'Clear Dates')}
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={[
          {
            header: t('passenger name', 'Passenger Name'),
            render: (p) => (
              <div className="flex items-center gap-2.5">
                <div className="w-[34px] h-[34px] rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-[0.85rem] shrink-0">
                  {(p.name[0] || 'P').toUpperCase()}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      p.isRegistered ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.isRegistered ? t('registered member', 'Registered Member') : t('guest passenger', 'Guest Passenger')}
                    </span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            header: t('contact info', 'Contact Info'),
            render: (p) => (
              <div className="text-[0.82rem]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <FaEnvelope className="text-slate-400" /> {p.email}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                  <FaPhone className="text-slate-400" /> {p.phone}
                </div>
              </div>
            ),
          },
          {
            header: t('booking.nationalId', 'National ID'),
            render: (p) => (
              <span className="text-[0.82rem] font-bold text-slate-800">
                {p.nationalId || '—'}
              </span>
            ),
          },
          {
            header: t('admin.stationCity', 'City / Station'),
            render: (p) => (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                {p.city || '—'}
              </span>
            ),
          },
          {
            header: t('registration date', 'Registration Date'),
            render: (p) => (
              <div>
                <span className="text-[0.82rem] font-bold text-slate-800">
                  {p.registeredDate ? new Date(p.registeredDate).toLocaleDateString() : '—'}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {p.registeredDate ? new Date(p.registeredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ),
          },
          {
            header: t('company bookings', 'Company Bookings'),
            render: (p) => (
              <span className="font-extrabold text-blue-600">
                {p.totalBookings} {t('tickets', 'tickets')}
              </span>
            ),
          },
          {
            header: t('last active', 'Last Active'),
            render: (p) => (
              <span className="text-[0.8rem] text-slate-500">
                {p.lastBookingDate ? new Date(p.lastBookingDate).toLocaleDateString() : '—'}
              </span>
            ),
          },
        ]}
        data={filteredPassengers}
        loading={loading}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('search passenger by name, email, phone...', 'Search passenger by name, email, phone...')}
        actions={
          <button
            onClick={fetchPassengers}
            className="px-3.5 py-2 bg-slate-50 border-[1.5px] border-slate-300 rounded-[10px] text-slate-700 font-bold text-[0.8rem] cursor-pointer flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
          >
            <FaSync className={loading ? 'fa-spin' : ''} /> {t('common.refresh', 'Refresh')}
          </button>
        }
      />
    </div>
  );
};

export default AdminPassengers;
