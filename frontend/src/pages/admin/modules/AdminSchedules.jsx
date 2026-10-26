import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaUserShield, FaCalendarAlt } from 'react-icons/fa';
import { scheduleAPI, busAPI, routeAPI, userAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const EMPTY = {
  tripId: '',
  busId: '',
  routeId: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
  price: '',
  assignedConductor: '',
};

const AdminSchedules = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, r, c] = await Promise.all([
        scheduleAPI.getAll(),
        busAPI.getAll(),
        routeAPI.getAll(),
        userAPI.getConductors().catch(() => []),
      ]);
      setSchedules((s || []).sort((a, b) => new Date(a.date) - new Date(b.date)));
      setBuses(b || []);
      setRoutes(r || []);
      setConductors(c || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({
      tripId: s.tripId || '',
      busId: s.bus?._id || '',
      routeId: s.route?._id || '',
      date: s.date,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      price: s.price,
      assignedConductor: s.assignedConductor?._id || s.assignedConductor || '',
    });
    setModal(s);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.busId) {
      notify.warning(MESSAGES.schedule.busRequired);
      return;
    }
    if (!form.routeId) {
      notify.warning(MESSAGES.schedule.departureRequired);
      return;
    }
    if (!form.date) {
      notify.warning(MESSAGES.schedule.dateRequired);
      return;
    }
    if (!form.departureTime) {
      notify.warning(MESSAGES.schedule.timeRequired);
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      notify.warning(MESSAGES.schedule.priceRequired);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tripId: form.tripId?.trim() || `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      if (modal === 'add') {
        await scheduleAPI.create(payload);
        notify.success(MESSAGES.schedule.created);
      } else {
        await scheduleAPI.update(modal._id, payload);
        notify.success(MESSAGES.schedule.updated);
      }
      setModal(null);
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.schedule.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule) => {
    const id = schedule?._id;
    const label = schedule?.tripId || (schedule?.route ? `${schedule.route.from} → ${schedule.route.to}` : '');

    const confirmed = await notify.confirm({
      title: t('delete schedule', 'Delete Trip Schedule?'),
      message: `${t('are you sure you want to delete', 'Are you sure you want to delete')} ${label ? `"${label}"` : t('this schedule', 'this schedule')}?`,
      description: t('this action cannot be undone', 'This action cannot be undone.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await scheduleAPI.delete(id);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.schedule.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const tripMatch = (s.tripId || '').toLowerCase().includes(q);
    const routeMatch = `${s.route?.from || ''} ${s.route?.to || ''}`.toLowerCase().includes(q);
    const busMatch = (s.bus?.busNumber || '').toLowerCase().includes(q);
    const conductorMatch = (s.assignedConductor?.name || '').toLowerCase().includes(q);
    return tripMatch || routeMatch || busMatch || conductorMatch;
  });

  const columns = [
    {
      header: t('trip id', 'Trip ID'),
      render: (s) => (
        <span className="font-extrabold text-indigo-600 bg-indigo-50 py-[3px] px-2 rounded-md text-[0.8rem]">
          {s.tripId || 'TRP'}
        </span>
      ),
    },
    {
      header: t('route', 'Route'),
      render: (s) => (
        <div>
          <div className="font-extrabold text-slate-900">{t(s.route?.from, s.route?.from)} → {t(s.route?.to, s.route?.to)}</div>
          <div className="text-[0.72rem] text-slate-500">{s.route?.duration}</div>
        </div>
      ),
    },
    {
      header: t('bus details', 'Bus Details'),
      render: (s) => (
        <div>
          <div className="font-bold text-slate-700">{s.bus?.busNumber || t('assigned bus', 'Assigned Bus')}</div>
          <div className="text-[0.72rem] text-slate-500">
            {t(s.bus?.type || 'Standard', s.bus?.type || 'Standard')} {s.bus?.plateNumber ? `· Plate: ${s.bus.plateNumber}` : ''}
          </div>
        </div>
      ),
    },
    {
      header: t('assigned conductor', 'Assigned Conductor'),
      render: (s) => (
        <div>
          {s.assignedConductor ? (
            <span className="font-bold text-teal-700 flex items-center gap-1 text-[0.82rem]">
              <FaUserShield className="text-[11px]" /> {s.assignedConductor.name}
            </span>
          ) : (
            <span className="text-slate-400 text-[0.78rem] italic">{t('unassigned', 'Unassigned')}</span>
          )}
        </div>
      ),
    },
    {
      header: t('travel date', 'Travel Date'),
      render: (s) => <span className="font-semibold">{s.date}</span>,
    },
    {
      header: t('departure', 'Departure'),
      render: (s) => <span className="font-extrabold text-eb-green">{s.departureTime}</span>,
    },
    {
      header: t('fare', 'Fare'),
      render: (s) => <span className="font-extrabold text-slate-900">ETB {s.price}</span>,
    },
    {
      header: t('seats left', 'Seats Left'),
      render: (s) => (
        <span className={`font-extrabold ${s.availableSeats < 5 ? 'text-red-600' : 'text-green-600'}`}>
          {s.availableSeats}
        </span>
      ),
    },
    {
      header: t('common.status', 'Status'),
      render: (s) => {
        const statusClass = (s.status || 'scheduled').toLowerCase();
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold capitalize border ${
            statusClass === 'scheduled' || statusClass === 'active' || statusClass === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            statusClass === 'delayed' || statusClass === 'boarding' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          }`}>
            {t(s.status, s.status)}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (s) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => openEdit(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaEdit /> {t('common.edit', 'Edit')}
          </button>
          <button onClick={() => handleDelete(s)} disabled={deletingId === s._id} aria-label={`Delete schedule ${s.tripId || ''}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaTrash /> {deletingId === s._id ? t('common.deleting', 'Deleting…') : t('common.delete', 'Delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={filteredSchedules}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('search by trip id, route, bus, conductor...', 'Search by Trip ID, route, bus, conductor...')}
        emptyMessage={t('no schedules found', "No schedules found. Click 'Add Schedule' to create your first trip.")}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-2 py-2 px-3.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-none rounded-xl font-extrabold text-[0.82rem] cursor-pointer shadow-[0_3px_10px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-px">
            <FaPlus /> {t('add trip schedule', 'Add Trip Schedule')}
          </button>
        }
      />

      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[1000] p-4 sm:p-5 backdrop-blur-[2px]">
          <div className="bg-white rounded-[18px] w-full max-w-[520px] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-eb-green to-[#046623] py-[18px] px-[22px] flex justify-between items-center text-white">
              <div>
                <div className="text-[#FCDD09] text-[0.7rem] font-extrabold uppercase">
                  {t('trip & conductor schedule', 'Trip & Conductor Schedule')}
                </div>
                <h3 className="text-white m-0 font-extrabold text-[1.1rem]">
                  {modal === 'add' ? t('create trip schedule', 'Create Trip Schedule') : t('edit trip schedule', 'Edit Trip Schedule')}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                className="bg-white/15 hover:bg-white/25 border-none text-white w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('trip identifier (trip id)', 'Trip Identifier (Trip ID)')}
                  </label>
                  <input
                    type="text"
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    placeholder=""
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] font-bold outline-none focus:border-eb-green"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('assigned conductor', 'Assigned Conductor')}
                  </label>
                  <select
                    value={form.assignedConductor}
                    onChange={(e) => setForm({ ...form, assignedConductor: e.target.value })}
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-eb-green"
                  >
                    <option value="">{t('choose conductor', 'Unassigned Conductor')}</option>
                    {conductors.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('buses.operator', 'Bus Fleet')} *
                </label>
                <select
                  value={form.busId}
                  onChange={(e) => setForm({ ...form, busId: e.target.value })}
                  required
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-eb-green"
                >
                  <option value="">{t('choose bus', 'Select your company bus...')}</option>
                  {buses.filter((b) => b.status === 'active').map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busNumber} {b.plateNumber ? `[${b.plateNumber}]` : ''} · {t(b.type, b.type)} · {b.capacity} {t('seats', 'seats')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('route', 'Route')} *
                </label>
                <select
                  value={form.routeId}
                  onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                  required
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-eb-green"
                >
                  <option value="">{t('choose route', 'Select your company route...')}</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {t(r.from, r.from)} → {t(r.to, r.to)} ({r.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('travel date', 'Travel Date')} *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.85rem] outline-none focus:border-eb-green"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('departure', 'Departure')} *
                  </label>
                  <input
                    type="text"
                    value={form.departureTime}
                    onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                    placeholder=""
                    required
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.85rem] outline-none focus:border-eb-green"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('arrival', 'Arrival')} *
                  </label>
                  <input
                    type="text"
                    value={form.arrivalTime}
                    onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                    placeholder=""
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.85rem] outline-none focus:border-eb-green"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('base ticket fare (etb)', 'Base Ticket Fare (ETB)')} *
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder=""
                  required
                  min="1"
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] font-bold outline-none focus:border-eb-green"
                />
              </div>

              <div className="flex gap-2.5 mt-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 border-[1.5px] border-slate-200 rounded-lg bg-white text-slate-500 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-2.5 border-none rounded-lg bg-eb-green hover:bg-emerald-700 text-white font-extrabold cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  <FaSave /> {saving ? t('common.saving', 'Saving...') : modal === 'add' ? t('create schedule', 'Create Schedule') : t('common.saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedules;
