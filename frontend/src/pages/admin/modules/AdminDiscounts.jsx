import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaTag, FaPercentage, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { discountAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const EMPTY = {
  code: '',
  name: '',
  discountType: 'percentage',
  discountValue: 10,
  tripType: 'round',
  minAmount: 0,
  isActive: true,
};

const AdminDiscounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await discountAPI.getAll();
      setDiscounts(data || []);
    } catch (err) {
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...EMPTY, code: `ROUND${Math.floor(10 + Math.random() * 90)}` });
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
    });
    setModal(d);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      toast.error('Please provide discount code and promotion name');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'add') {
        await discountAPI.create(form);
        toast.success('Promotional discount created successfully!');
      } else {
        await discountAPI.update(modal._id, form);
        toast.success('Discount updated successfully!');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount offer?')) return;
    try {
      await discountAPI.delete(id);
      toast.success('Discount deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const filteredDiscounts = discounts.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (d.code || '').toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q);
  });

  const columns = [
    {
      header: 'Promo Code',
      render: (d) => (
        <span style={{ fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {d.code}
        </span>
      ),
    },
    {
      header: 'Promotion Name',
      render: (d) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {d.tripType === 'round' ? '🔄 Round-Trip Bookings Only' : '✈️ All Trip Types'}
          </div>
        </div>
      ),
    },
    {
      header: 'Discount Amount',
      render: (d) => (
        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
          {d.discountType === 'percentage' ? `${d.discountValue}% OFF` : `ETB ${d.discountValue} FLAT OFF`}
        </span>
      ),
    },
    {
      header: 'Min Booking Fare',
      render: (d) => <span style={{ fontWeight: 600, color: '#334155' }}>ETB {d.minAmount || 0}</span>,
    },
    {
      header: 'Status',
      render: (d) => (
        <span style={{
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          background: d.isActive ? '#dcfce7' : '#fee2e2',
          color: d.isActive ? '#15803d' : '#b91c1c',
        }}>
          {d.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (d) => (
        <div className="eb-action-group">
          <button onClick={() => openEdit(d)} className="eb-btn-action eb-btn-edit">
            <FaEdit /> Edit
          </button>
          <button onClick={() => handleDelete(d._id)} className="eb-btn-action eb-btn-delete">
            <FaTrash /> Del
          </button>
        </div>
      ),
    },
  ];

  const activeCount = discounts.filter((d) => d.isActive).length;
  const roundTripCount = discounts.filter((d) => d.tripType === 'round' && d.isActive).length;

  return (
    <div>
      <AdminPageHeader
        category="MARKETING & PROMOTIONS"
        title="Promotions & Discounts"
        icon={<FaTag />}
        subtitle="Manage promotional discount codes, round-trip automatic savers, percentage cuts, and minimum fare thresholds."
        stats={[
          { label: 'Total Discounts', value: discounts.length, color: '#0284c7' },
          { label: 'Active Promotions', value: activeCount, color: '#16a34a' },
          { label: 'Round-Trip Savers', value: roundTripCount, color: '#7c3aed' },
        ]}
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header">
            <FaPlus /> Create Promotion
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredDiscounts}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search promo codes or names..."
        emptyMessage="No discounts configured. Click 'Add Discount' to create your first round-trip promotion."
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <FaPlus /> Add Discount
          </button>
        }
      />

      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,7,40,.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,.2)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg,#4f46e5,#3730a3)',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#c7d2fe', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  Promotions &amp; Discounts
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                  {modal === 'add' ? 'Create Promotional Discount' : 'Edit Discount'}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: 'rgba(255,255,255,.15)',
                  border: 'none',
                  color: '#fff',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Discount Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="ROUNDTRIP10"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Eligible Trip Type
                  </label>
                  <select
                    value={form.tripType}
                    onChange={(e) => setForm({ ...form, tripType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="round">Round-Trip Only</option>
                    <option value="all">All Trips (One-Way &amp; Round)</option>
                    <option value="oneway">One-Way Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Promotion / Offer Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. 10% Round-Trip Traveler Saver"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Discount Calculation
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="percentage">Percentage (% Off)</option>
                    <option value="fixed">Fixed Amount (ETB Off)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    {form.discountType === 'percentage' ? 'Percentage (% Value)' : 'Fixed Amount (ETB)'}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    required
                    min="1"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Minimum Total Fare Threshold (ETB)
                </label>
                <input
                  type="number"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Active discount (applied automatically to round-trip bookings)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '11px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FaSave /> {saving ? 'Saving...' : modal === 'add' ? 'Save Promotion' : 'Update Discount'}
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
