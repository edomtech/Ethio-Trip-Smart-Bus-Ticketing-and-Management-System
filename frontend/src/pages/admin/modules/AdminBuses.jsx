import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaBus } from 'react-icons/fa';
import { busAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const EMPTY = { busNumber: '', plateNumber: '', type: 'Standard', capacity: 45, status: 'active' };

const AdminBuses = () => {
  const { t } = useTranslation();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);  
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const notify = useNotification();

  const load = async () => {
    setLoading(true);
    try {
      const data = await busAPI.getAll();
      setBuses(data || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (bus) => {
    setForm({
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber || '',
      type: bus.type,
      capacity: bus.capacity,
      status: bus.status,
    });
    setModal(bus);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        await busAPI.create(form);
        notify.success(MESSAGES.bus.added);
      } else {
        await busAPI.update(modal._id, form);
        notify.success(MESSAGES.bus.updated);
      }
      setModal(null);
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.bus.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bus) => {
    const id = bus?._id;
    const name = bus?.busNumber || bus?.plateNumber || '';

    const confirmed = await notify.confirm({
      title: t('delete bus', 'Delete Bus?'),
      message: `${t('are you sure you want to delete', 'Are you sure you want to delete')} ${name ? `"${name}"` : t('this bus', 'this bus')}?`,
      description: t('this action cannot be undone', 'This action cannot be undone.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await busAPI.delete(id);
      setBuses((prev) => prev.filter((b) => b._id !== id));
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.bus.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBuses = buses.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.busNumber || '').toLowerCase().includes(q) ||
      (b.plateNumber || '').toLowerCase().includes(q) ||
      (b.type || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: t('buses.busNumber', 'Bus Name / Model'),
      render: (bus) => (
        <div>
          <div className="font-extrabold text-slate-900">{bus.busNumber}</div>
        </div>
      ),
    },
    {
      header: t('buses.plateNumber', 'Plate Number'),
      render: (bus) => (
        <span className="font-mono font-extrabold bg-slate-50 text-slate-800 px-2.5 py-1 rounded-md border-[1.5px] border-slate-300 text-[0.82rem] inline-block tracking-wide">
          {bus.plateNumber || t('not set', 'Not Set')}
        </span>
      ),
    },
    {
      header: t('buses.type', 'Type'),
      render: (bus) => {
        const typeClass = (bus.type || 'Standard').toLowerCase();
        return <span className={`eb-badge eb-badge-${typeClass}`}>{t(bus.type, bus.type)}</span>;
      },
    },
    {
      header: t('buses.capacity', 'Capacity'),
      render: (bus) => <span className="font-bold text-slate-700">{bus.capacity} {t('seats', 'seats')}</span>,
    },
    {
      header: t('common.status', 'Status'),
      render: (bus) => {
        const statusClass = (bus.status || 'active').toLowerCase();
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold capitalize border ${
            statusClass === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            statusClass === 'maintenance' || statusClass === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          }`}>
            {t(bus.status, bus.status)}
          </span>
        );
      },
    },
    {
      header: t('common.actions', 'Actions'),
      render: (bus) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => openEdit(bus)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaEdit /> {t('common.edit', 'Edit')}
          </button>
          <button onClick={() => handleDelete(bus)} disabled={deletingId === bus._id} aria-label={`Delete ${bus.busNumber || 'bus'}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaTrash /> {deletingId === bus._id ? t('common.deleting', 'Deleting…') : t('common.delete', 'Delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={filteredBuses}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('search bus fleet by model or type...', 'Search bus fleet by model or type...')}
        emptyMessage={t('no buses found in your company fleet', "No buses found in your company fleet. Click 'Add Bus' to register one.")}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-none rounded-xl font-extrabold text-[0.82rem] cursor-pointer shadow-[0_3px_10px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-px">
            <FaPlus /> {t('buses.addBusBtn', 'Add Bus')}
          </button>
        }
      />

      {modal !== null && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[18px] w-full max-w-[440px] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-eb-green to-[#046623] px-5 py-[18px] flex justify-between items-center">
              <div>
                <div className="text-eb-yellow text-[0.7rem] font-extrabold uppercase">{t('fleet management', 'Fleet Management')}</div>
                <h3 className="text-white m-0 font-extrabold">
                  {modal === 'add' ? t('buses.addBusBtn', 'Add New Bus') : `${t('common.edit', 'Edit')} ${modal.busNumber}`}
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
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('buses.busNumber', 'Bus Name / Model')} *</label>
                <input
                  type="text"
                  value={form.busNumber}
                  onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                  placeholder=""
                  required
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                />
              </div>
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('buses.plateNumber', 'Bus Plate Number')} *</label>
                <input
                  type="text"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  placeholder=""
                  required
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('buses.type', 'Bus Type')}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  >
                    {['Standard', 'Luxury', 'VIP'].map((item) => (
                      <option key={item} value={item}>{t(item, item)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('buses.capacity', 'Capacity')}</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    min={10}
                    max={80}
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('common.status', 'Status')}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-eb-green"
                >
                  {['active', 'maintenance', 'inactive'].map((s) => (
                    <option key={s} value={s}>{t(s, s)}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-gradient-to-br from-eb-green to-[#046623] text-white border-none rounded-[10px] font-extrabold cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                <FaSave /> {saving ? t('common.saving', 'Saving...') : modal === 'add' ? t('buses.addBusBtn', 'Add Bus') : t('common.saveChanges', 'Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBuses;
