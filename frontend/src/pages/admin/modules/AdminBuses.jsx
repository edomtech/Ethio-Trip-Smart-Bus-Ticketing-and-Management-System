import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaBus } from 'react-icons/fa';
import { busAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const EMPTY = { busNumber: '', plateNumber: '', type: 'Standard', capacity: 45, status: 'active' };

const AdminBuses = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | {bus obj}
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await busAPI.getAll();
      setBuses(data || []);
    } catch {
      toast.error('Failed to load buses');
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
        toast.success('Bus added to fleet successfully!');
      } else {
        await busAPI.update(modal._id, form);
        toast.success('Bus updated successfully!');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bus from fleet?')) return;
    setDeletingId(id);
    try {
      await busAPI.delete(id);
      toast.success('Bus deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
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
      header: 'Bus Name / Model',
      render: (bus) => (
        <div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>{bus.busNumber}</div>
        </div>
      ),
    },
    {
      header: 'Plate Number',
      render: (bus) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 800,
            background: '#f8fafc',
            color: '#1e293b',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            fontSize: '0.82rem',
            display: 'inline-block',
            letterSpacing: '0.5px',
          }}
        >
          {bus.plateNumber || 'Not Set'}
        </span>
      ),
    },
    {
      header: 'Type',
      render: (bus) => {
        const typeClass = (bus.type || 'Standard').toLowerCase();
        return <span className={`eb-badge eb-badge-${typeClass}`}>{bus.type}</span>;
      },
    },
    {
      header: 'Capacity',
      render: (bus) => <span style={{ fontWeight: 700, color: '#334155' }}>{bus.capacity} seats</span>,
    },
    {
      header: 'Status',
      render: (bus) => {
        const statusClass = (bus.status || 'active').toLowerCase();
        return <span className={`eb-badge eb-badge-${statusClass}`}>{bus.status}</span>;
      },
    },
    {
      header: 'Actions',
      render: (bus) => (
        <div className="eb-action-group">
          <button onClick={() => openEdit(bus)} className="eb-btn-action eb-btn-edit">
            <FaEdit /> Edit
          </button>
          <button onClick={() => handleDelete(bus._id)} disabled={deletingId === bus._id} className="eb-btn-action eb-btn-delete">
            <FaTrash /> {deletingId === bus._id ? '...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        category="FLEET LOGISTICS"
        title="Company Bus Fleet"
        icon={<FaBus />}
        subtitle="Manage fleet inventory, seating capacities, vehicle types, and active route assignments."
        stats={[
          { label: 'Total Buses', value: buses.length, color: '#0284c7' },
          { label: 'Active in Fleet', value: buses.filter((b) => b.status === 'active').length, color: '#16a34a' },
          { label: 'Inactive / Maintenance', value: buses.filter((b) => b.status !== 'active').length, color: '#d97706' },
        ]}
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header">
            <FaPlus /> Add New Bus
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredBuses}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bus fleet by model or type..."
        emptyMessage="No buses found in your company fleet. Click 'Add Bus' to register one."
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <FaPlus /> Add Bus
          </button>
        }
      />

      {/* Modal */}
      {modal !== null && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '440px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,.2)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg,#078930,#046623)',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#FCDD09', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  Fleet Management
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                  {modal === 'add' ? 'Add New Bus' : `Edit ${modal.busNumber}`}
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
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Bus Name / Model *
                </label>
                <input
                  type="text"
                  value={form.busNumber}
                  onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                  placeholder="e.g. Luxury Coach (VIP-02)"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Bus Plate Number *
                </label>
                <input
                  type="text"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  placeholder="e.g. 3-A12345-ET"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Bus Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    {['Standard', 'Luxury', 'VIP'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    min={10}
                    max={80}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  {['active', 'maintenance', 'inactive'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '11px',
                  background: 'linear-gradient(135deg,#078930,#046623)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <FaSave /> {saving ? 'Saving...' : modal === 'add' ? 'Add Bus' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBuses;
