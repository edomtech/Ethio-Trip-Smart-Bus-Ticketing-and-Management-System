import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { discountAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';
import { useTranslation } from '../../../i18n';

const EMPTY = {
  code: '',
  name: '',
  discountType: 'percentage',
  discountValue: 10,
  tripType: 'round',
  minAmount: 0,
  isActive: true,
  holidayTag: 'None',
  showOnHomePage: false,
};

const AdminDiscounts = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await discountAPI.getAll();
      setDiscounts(data || []);
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports?.loadFailed || t('admin.loadFailed', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...EMPTY, code: `OFFER${Math.floor(100 + Math.random() * 900)}` });
    setModal('add');
  };

  const openEdit = (d) => {
    setForm({
      code: d.code,
      name: d.name,
      discountType: d.discountType,
      discountValue: d.discountValue,
      tripType: d.tripType,
      minAmount: d.minAmount,
      isActive: d.isActive,
      holidayTag: d.holidayTag || 'None',
      showOnHomePage: Boolean(d.showOnHomePage),
    });
    setModal(d);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code?.trim()) {
      notify.warning(MESSAGES.discount?.codeRequired || t('forms.required', 'Required'));
      return;
    }
    if (!form.name?.trim()) {
      notify.warning(MESSAGES.discount?.nameRequired || t('forms.required', 'Required'));
      return;
    }
    setSaving(true);
    try {
      if (modal === 'add') {
        await discountAPI.create(form);
      } else {
        await discountAPI.update(modal._id, form);
      }
      setModal(null);
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.discount?.saveFailed || t('common.error', 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (discount) => {
    const id = discount?._id;
    const name = discount?.name || discount?.code || '';

    const confirmed = await notify.confirm({
      title: t('admin.deleteDiscountTitle', 'Delete Discount?'),
      message: `${t('admin.confirmDelete', 'Are you sure you want to delete')} ${name ? `"${name}"` : t('admin.thisDiscount', 'this discount offer')}?`,
      description: t('admin.deleteDiscountDesc', 'Passengers will no longer be able to use this promotion code. This action cannot be undone.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await discountAPI.delete(id);
      setDiscounts((prev) => prev.filter((d) => d._id !== id));
      load();
    } catch (err) {
      notify.notifyError(err, MESSAGES.discount?.deleteFailed || t('common.error', 'Error'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDiscounts = discounts.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (d.code || '').toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q);
  });

  const columns = [
    {
      header: t('admin.promoCode', 'Promo Code'),
      render: (d) => (
        <span className="font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md text-[0.85rem] font-mono">
          {d.code}
        </span>
      ),
    },
    {
      header: t('admin.promotionName', 'Promotion Name'),
      render: (d) => (
        <div>
          <div className="font-bold text-slate-900">{d.name}</div>
          <div className="text-xs text-slate-500">
            {d.tripType === 'round' ? `🔄 ${t('admin.roundTripOnly', 'Round-Trip Bookings Only')}` : `✈️ ${t('admin.allTripTypes', 'All Trip Types')}`}
          </div>
        </div>
      ),
    },
    {
      header: t('admin.discountAmount', 'Discount Amount'),
      render: (d) => (
        <span className="font-extrabold text-emerald-600 text-[0.9rem]">
          {d.discountType === 'percentage' ? `${d.discountValue}% ${t('admin.off', 'OFF')}` : `ETB ${d.discountValue} ${t('admin.flatOff', 'FLAT OFF')}`}
        </span>
      ),
    },
    {
      header: t('admin.minFare', 'Min Booking Fare'),
      render: (d) => <span className="font-semibold text-slate-700">ETB {d.minAmount || 0}</span>,
    },
    {
      header: t('common.status', 'Status'),
      render: (d) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          d.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {d.isActive ? t('common.active', 'ACTIVE') : t('common.inactive', 'INACTIVE')}
        </span>
      ),
    },
    {
      header: t('common.actions', 'Actions'),
      render: (d) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(d)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors">
            <FaEdit /> {t('common.edit', 'Edit')}
          </button>
          <button onClick={() => handleDelete(d)} disabled={deletingId === d._id} aria-label={`Delete discount ${d.code || ''}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[0.76rem] font-bold cursor-pointer border-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            <FaTrash /> {deletingId === d._id ? t('common.loading', 'Deleting…') : t('common.delete', 'Del')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={filteredDiscounts}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('admin.searchPromoPlaceholder', 'Search promo codes or names...')}
        emptyMessage={t('admin.noDiscountsFound', "No discounts configured. Click 'Add Discount' to create your first round-trip promotion.")}
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white border-none rounded-xl font-extrabold text-[0.82rem] cursor-pointer shadow-[0_3px_10px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-px">
            <FaPlus /> {t('admin.addDiscount', 'Add Discount')}
          </button>
        }
      />

      {modal && (
        <div className="fixed inset-0 bg-[#0f0728]/60 flex items-center justify-center z-[1000] p-5">
          <div className="bg-white rounded-[18px] w-full max-w-[480px] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-5 py-[18px] flex justify-between items-center">
              <div>
                <div className="text-indigo-200 text-[0.7rem] font-extrabold uppercase">
                  {t('admin.promotionsDiscounts', 'Promotions & Discounts')}
                </div>
                <h3 className="text-white m-0 font-extrabold">
                  {modal === 'add' ? t('admin.createDiscount', 'Create Promotional Discount') : t('admin.editDiscount', 'Edit Discount')}
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
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('admin.promoCode', 'Discount Code')}</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder=""
                    required
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] font-extrabold uppercase focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('admin.eligibleTripType', 'Eligible Trip Type')}</label>
                  <select
                    value={form.tripType}
                    onChange={(e) => setForm({ ...form, tripType: e.target.value })}
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-indigo-400"
                  >
                    <option value="round">{t('admin.roundTripOnly', 'Round-Trip Only')}</option>
                    <option value="all">{t('admin.allTripTypes', 'All Trips (One-Way & Round)')}</option>
                    <option value="oneway">{t('admin.oneWayOnly', 'One-Way Only')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('admin.promotionName', 'Promotion / Offer Name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder=""
                  required
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">{t('admin.calculation', 'Discount Calculation')}</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-indigo-400"
                  >
                    <option value="percentage">{t('admin.percentageOff', 'Percentage (% Off)')}</option>
                    <option value="fixed">{t('admin.fixedOff', 'Fixed Amount (ETB Off)')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                    {form.discountType === 'percentage' ? t('admin.percentageVal', 'Percentage (% Value)') : t('admin.fixedVal', 'Fixed Amount (ETB)')}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] font-bold focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-slate-500 block mb-1">
                  {t('admin.minTotalFare', 'Minimum Total Fare Threshold (ETB)')}
                </label>
                <input
                  type="number"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[0.9rem] focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[0.75rem] font-bold text-amber-600 block mb-1">
                  🎉 {t('admin.holidayTag', 'Holiday Ceremony Tag / Special Event')}
                </label>
                <select
                  value={form.holidayTag}
                  onChange={(e) => setForm({ ...form, holidayTag: e.target.value, showOnHomePage: e.target.value !== 'None' ? true : form.showOnHomePage })}
                  className="w-full px-3 py-2 border-[1.5px] border-amber-200 bg-amber-50/50 rounded-lg text-[0.9rem] font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="None">{t('admin.noneRegular', 'None (Regular Discount)')}</option>
                  <option value="Easter">{t('admin.easterOffer', 'Easter Special Offer (ፋሲካ)')}</option>
                  <option value="Christmas">{t('admin.christmasOffer', 'Christmas Special Offer (ገና)')}</option>
                  <option value="New Year">{t('admin.newYearOffer', 'New Year Special Offer (እንቁጣጣሽ)')}</option>
                  <option value="Eid">{t('admin.eidOffer', 'Eid Mubarak Offer (ኢድ)')}</option>
                  <option value="Epiphany / Timket">{t('admin.timketOffer', 'Epiphany / Timket Offer (ጥምቀት)')}</option>
                  <option value="Holiday Special">{t('admin.otherHolidayOffer', 'Other Holiday Ceremony')}</option>
                </select>
              </div>

              <div className="space-y-2 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showOnHomeCheck"
                    checked={form.showOnHomePage}
                    onChange={(e) => setForm({ ...form, showOnHomePage: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="showOnHomeCheck" className="text-[0.85rem] font-bold text-emerald-700 cursor-pointer">
                    ✨ {t('admin.showOnHome', 'Display this special offer banner on the Home Page')}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activeCheck"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="activeCheck" className="text-[0.85rem] font-semibold text-slate-700 cursor-pointer">
                    {t('admin.activeDiscountNotice', 'Active discount (applied automatically to bookings)')}
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 mt-3">
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
                  className="flex-[2] py-2.5 border-none rounded-lg bg-indigo-600 text-white font-extrabold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors disabled:opacity-70"
                >
                  <FaSave /> {saving ? t('common.saving', 'Saving...') : modal === 'add' ? t('admin.savePromotion', 'Save Promotion') : t('admin.updateDiscount', 'Update Discount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscounts;
