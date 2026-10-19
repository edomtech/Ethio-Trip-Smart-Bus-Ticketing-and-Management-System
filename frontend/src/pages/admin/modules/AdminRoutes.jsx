import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaRoute, FaCity } from 'react-icons/fa';
import { routeAPI, platformSettingAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const DEFAULT_CITIES = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga', 'Arba Minch', 'Shashamane'];
const EMPTY = { from: '', to: '', distance: '', duration: '', stops: '', status: 'active' };

const AdminRoutes = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [cities, setCities] = useState(DEFAULT_CITIES);
  const [cityModal, setCityModal] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [savingCity, setSavingCity] = useState(false);

  const loadCities = async () => {
    try {
      const data = await platformSettingAPI.getSettings();
      if (data?.cities?.length > 0) setCities(data.cities);
    } catch {
      setCities(DEFAULT_CITIES);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await routeAPI.getAll();
      setRoutes(data || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadCities();
  }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (r) => {
    setForm({
      from: r.from,
      to: r.to,
      distance: r.distance,
      duration: r.duration,
      stops: Array.isArray(r.stops) ? r.stops.join(', ') : r.stops || '',
      status: r.status,
    });
    setModal(r);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        await routeAPI.create(form);
        notify.success(MESSAGES.route.added);
      } else {
        await routeAPI.update(modal._id, form);
        notify.success(MESSAGES.route.updated);
      }
      setModal(null);
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.route.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (route) => {
    const id = route?._id;
    const label = route ? `${route.from} → ${route.to}` : '';

    const confirmed = await notify.confirm({
      title: t('delete route', 'Delete Route?'),
      message: `${t('are you sure you want to delete', 'Are you sure you want to delete')} ${label ? `"${label}"` : t('this route', 'this route')}?`,
      description: t('this action cannot be undone', 'This action cannot be undone.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await routeAPI.delete(id);
      setRoutes((prev) => prev.filter((r) => r._id !== id));
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.route.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    const trimmed = newCity.trim();
    if (!trimmed) return;
    if (cities.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      notify.warning({
        title: t('city already exists', 'City Already Exists'),
        description: `"${trimmed}" ${t('is already in the city list', 'is already in the city list.')}`,
      });
      return;
    }
    setSavingCity(true);
    try {
      const updatedCities = [...cities, trimmed];
      await platformSettingAPI.updateSettings({ cities: updatedCities });
      setCities(updatedCities);
      setNewCity('');
      setCityModal(false);
    } catch (err) {
      notify.notifyError(err, MESSAGES.settings.saveFailed);
    } finally {
      setSavingCity(false);
    }
  };

  const filteredRoutes = routes.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (r.from || '').toLowerCase().includes(q) || (r.to || '').toLowerCase().includes(q);
  });

  const columns = [
    {
      header: t('routes.origin', 'Origin City'),
      render: (r) => <span className="font-extrabold text-eb-green">{t(r.from, r.from)}</span>,
    },
    {
      header: t('routes.destination', 'Destination City'),
      render: (r) => <span className="font-extrabold text-slate-900">{t(r.to, r.to)}</span>,
    },
    {
      header: t('distance', 'Distance'),
      render: (r) => <span className="font-semibold">{r.distance} km</span>,
    },
    {
      header: t('est. duration', 'Est. Duration'),
      render: (r) => <span className="text-slate-500">{r.duration}</span>,
    },
    {
      header: t('stops', 'Stops'),
      render: (r) => (
        <span className="text-[0.78rem] text-slate-500">
          {Array.isArray(r.stops) ? r.stops.join(', ') : r.stops || t('direct non-stop', 'Direct Non-Stop')}
        </span>
      ),
    },
    {
      header: t('common.status', 'Status'),
      render: (r) => {
        const statusClass = (r.status || 'active').toLowerCase();
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold capitalize border ${
            statusClass === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            statusClass === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          }`}>
            {t(r.status || 'Active', r.status || 'Active')}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaEdit /> {t('common.edit', 'Edit')}
          </button>
          <button onClick={() => handleDelete(r)} disabled={deletingId === r._id} aria-label={`Delete route ${r.from} to ${r.to}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaTrash /> {deletingId === r._id ? t('common.deleting', 'Deleting…') : t('common.delete', 'Delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={filteredRoutes}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('search routes by departure or arrival...', 'Search routes by departure or arrival...')}
        emptyMessage={t('no routes found in network', "No routes found. Click 'Add Route' to expand your transport network.")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setNewCity(''); setCityModal(true); }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-emerald-500 text-emerald-700 rounded-xl font-extrabold text-[0.82rem] cursor-pointer transition-all hover:-translate-y-px hover:bg-emerald-50"
            >
              <FaCity /> {t('add city', 'Add City')}
            </button>
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-none rounded-xl font-extrabold text-[0.82rem] cursor-pointer shadow-[0_3px_10px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-px">
              <FaPlus /> {t('add route', 'Add Route')}
            </button>
          </div>
        }
      />

      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h4 className="text-[0.82rem] font-extrabold text-slate-700 mb-2 flex items-center gap-2">
          <FaCity className="text-emerald-600" /> {t('available cities', 'Available Cities')} ({cities.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {cities.map((c) => (
            <span key={c} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[0.75rem] font-semibold text-slate-700 shadow-xs">
              {t(c, c)}
            </span>
          ))}
        </div>
      </div>

      {cityModal && (
        <div
          onClick={() => setCityModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[18px] w-full max-w-[400px] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-eb-green to-[#046623] px-5 py-[18px] flex justify-between items-center">
              <div>
                <div className="text-eb-yellow text-[0.7rem] font-extrabold uppercase">{t('city management', 'City Management')}</div>
                <h3 className="text-white m-0 font-extrabold">{t('add new city', 'Add New City')}</h3>
              </div>
              <button
                onClick={() => setCityModal(false)}
                className="bg-white/15 border-none text-white w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddCity} className="p-5 flex flex-col gap-3">
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('city name', 'City Name')} *</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Shashemene, Bale, Nekemte..."
                  required
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                />
              </div>
              <p className="text-[0.75rem] text-slate-400 m-0">
                {t('added cities will appear in dropdowns', 'Added cities will appear in the departure and destination dropdowns for routes and bus searches across the platform.')}
              </p>
              <button
                type="submit"
                disabled={savingCity}
                className="py-2.5 bg-gradient-to-br from-eb-green to-[#046623] text-white border-none rounded-[10px] font-extrabold cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                <FaSave /> {savingCity ? t('common.saving', 'Saving...') : t('add city', 'Add City')}
              </button>
            </form>
          </div>
        </div>
      )}

      {modal !== null && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[18px] w-full max-w-[480px] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-eb-green to-[#046623] px-5 py-[18px] flex justify-between items-center">
              <div>
                <div className="text-eb-yellow text-[0.7rem] font-extrabold uppercase">
                  {t('route management', 'Route Management')}
                </div>
                <h3 className="text-white m-0 font-extrabold">
                  {modal === 'add' ? t('add new route', 'Add New Route') : t('edit route', 'Edit Route')}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                className="bg-white/15 border-none text-white w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('home.from', 'From (Departure City)')} *
                  </label>
                  <select
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  >
                    <option value="">{t('choose departure city', 'Select origin city...')}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{t(c, c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('home.to', 'To (Destination)')} *
                  </label>
                  <select
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  >
                    <option value="">{t('choose destination city', 'Select destination...')}</option>
                    {cities.filter((c) => c !== form.from).map((c) => (
                      <option key={c} value={c}>{t(c, c)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('distance (km)', 'Distance (km)')} *
                  </label>
                  <input
                    type="number"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('est. duration', 'Duration')} *
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder=""
                    required
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('stops optional', 'Stops (comma-separated, optional)')}
                </label>
                <input
                  type="text"
                  value={form.stops}
                  onChange={(e) => setForm({ ...form, stops: e.target.value })}
                  placeholder=""
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 bg-gradient-to-br from-eb-green to-[#046623] text-white border-none rounded-[10px] font-extrabold cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                <FaSave /> {saving ? t('common.saving', 'Saving...') : modal === 'add' ? t('add route', 'Add Route') : t('common.saveChanges', 'Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoutes;
