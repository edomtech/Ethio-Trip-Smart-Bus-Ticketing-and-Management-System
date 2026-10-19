import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTimes, FaSave, FaUserTie, FaUserShield } from 'react-icons/fa';
import { userAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const EMPTY = { name: '', email: '', phone: '', city: 'Addis Ababa', password: '', role: 'agent' };
const CITIES = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga'];

const AdminAgents = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const data = await userAPI.getStaff();
      setStaffList(data || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.createStaff(form);
      const roleName = form.role === 'conductor' ? 'Conductor' : 'Staff Agent';
      notify.success(MESSAGES.staff.created(form.name || 'Account', roleName));
      setShowModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.staff.createFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff) => {
    const id = staff?._id;
    const roleLabel = staff?.role === 'conductor' ? t('conductor.portal', 'Bus Conductor') : t('agent.portal', 'Ticket Agent');

    const confirmed = await notify.confirm({
      title: `${t('common.delete', 'Delete')} ${roleLabel}?`,
      message: `${t('admin.deleteStaffTitle', 'Are you sure you want to delete')} ${staff?.name ? `"${staff.name}"` : ''}?`,
      description: t('admin.deleteStaffDesc', 'This account will lose access immediately. This action cannot be undone.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await userAPI.delete(id);
      setStaffList((prev) => prev.filter((a) => a._id !== id));
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.staff.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = staffList.filter((a) => {
    if (roleFilter === 'agent' && a.role !== 'agent' && a.role !== 'company_staff') return false;
    if (roleFilter === 'conductor' && a.role !== 'conductor') return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q);
  });

  const columns = [
    {
      header: t('admin.staffName', 'Staff Name'),
      render: (a) => {
        const isConductor = a.role === 'conductor';
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={`w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-extrabold text-[0.9rem] shrink-0 ${
                isConductor ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' : 'bg-gradient-to-br from-sky-600 to-sky-700'
              }`}
            >
              {(a.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-slate-900 block">{a.name}</span>
              <span className="text-[0.72rem] text-slate-500">{a.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: t('admin.staffRole', 'Staff Role'),
      render: (a) => {
        const isConductor = a.role === 'conductor';
        return (
          <span
            className={`py-[3px] px-2 rounded-md text-[11px] font-bold inline-flex items-center gap-1 ${
              isConductor ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isConductor ? <FaUserShield /> : <FaUserTie />}
            {isConductor ? t('conductor.portal', 'Bus Conductor') : t('agent.portal', 'Ticket Agent')}
          </span>
        );
      },
    },
    {
      header: t('admin.phone', 'Phone Number'),
      render: (a) => <span className="font-semibold">{a.phone || '—'}</span>,
    },
    {
      header: t('admin.stationCity', 'Station / City'),
      render: (a) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold bg-slate-50 text-slate-700 border border-slate-200">
          {a.city || 'Addis Ababa'}
        </span>
      ),
    },
    {
      header: t('common.actions', 'Actions'),
      render: (a) => (
        <button
          onClick={() => handleDelete(a)}
          disabled={deletingId === a._id}
          aria-label={`Delete account ${a.name || 'staff'}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors"
        >
          <FaTrash /> {deletingId === a._id ? t('common.deleting', 'Deleting…') : t('common.delete', 'Delete')}
        </button>
      ),
    },
  ];

  const agentCount = staffList.filter((s) => s.role !== 'conductor').length;
  const conductorCount = staffList.filter((s) => s.role === 'conductor').length;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'ALL', label: `${t('admin.allStaff', 'All Staff')} (${staffList.length})` },
          { id: 'agent', label: `${t('admin.ticketAgents', 'Ticket Agents')} (${agentCount})` },
          { id: 'conductor', label: `${t('admin.conductors', 'Conductors')} (${conductorCount})` },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setRoleFilter(btn.id)}
            className={`py-1.5 px-3.5 rounded-lg border font-semibold text-[13px] cursor-pointer transition-colors ${
              roleFilter === btn.id ? 'border-emerald-600 bg-green-100 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('admin.searchStaff', 'Search staff by name, email, or city...')}
        emptyMessage={t('admin.noStaffFound', "No staff accounts found. Click 'Add Staff' to create Ticket Agents and Conductors.")}
        actions={
          <button
            onClick={() => { setForm(EMPTY); setShowModal(true); }}
            className="py-2.5 px-4.5 bg-gradient-to-br from-eb-green to-[#046623] text-white border-none rounded-xl font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-2 shadow-[0_4px_14px_rgba(7,137,48,0.3)] hover:opacity-95 transition-opacity"
          >
            <FaPlus /> {t('admin.addAgentConductor', 'Add Agent / Conductor')}
          </button>
        }
      />

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[18px] w-full max-w-[440px] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 py-[18px] px-[22px] flex justify-between items-center text-white">
              <div>
                <div className="text-amber-300 text-[0.7rem] font-extrabold uppercase">
                  {t('admin.staffManagement', 'Staff Management')}
                </div>
                <h3 className="text-white m-0 font-extrabold text-[1.1rem]">{t('admin.createStaffAccount', 'Create Staff Account')}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="bg-white/15 hover:bg-white/25 border-none text-white w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-[22px] flex flex-col gap-3.5">
              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('admin.accountRole', 'Account Role')}
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] font-bold outline-none focus:border-emerald-600"
                >
                  <option value="agent">{t('admin.roleAgentDesc', 'Ticket Agent (Counter Booking & Verification)')}</option>
                  <option value="conductor">{t('admin.roleConductorDesc', 'Bus Conductor (Onboard QR Scan & Boarding)')}</option>
                </select>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('forms.passengerFullName', 'Full Name')}
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('forms.email', 'Email Address')}
                </label>
                <input
                  type="email"
                  placeholder=""
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('forms.phone', 'Phone Number')}
                  </label>
                  <input
                    type="tel"
                    placeholder=""
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    onKeyDown={e => {
                      if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {t('admin.stationCity', 'City / Station')}
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-emerald-600"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{t(c, c)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('admin.initialPassword', 'Initial Password')}
                </label>
                <input
                  type="password"
                  placeholder=""
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full py-2 px-3 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border-[1.5px] border-slate-200 rounded-lg bg-white text-slate-500 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-2.5 border-none rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-extrabold cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity disabled:opacity-60"
                >
                  <FaSave /> {saving ? t('admin.creatingStaff', 'Creating...') : t('admin.createAccountBtn', 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgents;
