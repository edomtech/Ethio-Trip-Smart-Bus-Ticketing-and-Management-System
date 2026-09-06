import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTimes, FaSave, FaUserTie, FaUserShield } from 'react-icons/fa';
import { userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const EMPTY = { name: '', email: '', phone: '', city: 'Addis Ababa', password: '', role: 'agent' };
const CITIES = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga'];

const AdminAgents = () => {
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
    } catch {
      toast.error('Failed to load company staff');
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
      toast.success(`${form.role === 'conductor' ? 'Conductor' : 'Ticket Agent'} ${form.name} created successfully!`);
      setShowModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff account?')) return;
    setDeletingId(id);
    try {
      await userAPI.delete(id);
      toast.success('Staff account deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
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
      header: 'Staff Name',
      render: (a) => {
        const isConductor = a.role === 'conductor';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isConductor ? 'linear-gradient(135deg,#6366f1,#4338ca)' : 'linear-gradient(135deg,#0284c7,#0369a1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              {(a.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>{a.name}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{a.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Staff Role',
      render: (a) => {
        const isConductor = a.role === 'conductor';
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            background: isConductor ? '#e0e7ff' : '#dbeafe',
            color: isConductor ? '#3730a3' : '#1d4ed8',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {isConductor ? <FaUserShield /> : <FaUserTie />}
            {isConductor ? 'Bus Conductor' : 'Ticket Agent'}
          </span>
        );
      },
    },
    {
      header: 'Phone Number',
      render: (a) => <span style={{ fontWeight: 600 }}>{a.phone || '—'}</span>,
    },
    {
      header: 'Station / City',
      render: (a) => (
        <span className="eb-badge eb-badge-vip" style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
          {a.city || 'Addis Ababa'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (a) => (
        <button
          onClick={() => handleDelete(a._id)}
          disabled={deletingId === a._id}
          className="eb-btn-action eb-btn-delete"
        >
          <FaTrash /> {deletingId === a._id ? '...' : 'Delete'}
        </button>
      ),
    },
  ];

  const agentCount = staffList.filter((s) => s.role !== 'conductor').length;
  const conductorCount = staffList.filter((s) => s.role === 'conductor').length;

  return (
    <div>
      <AdminPageHeader
        category="HUMAN RESOURCES & STAFFING"
        title="Ticket Agents & Conductors"
        icon={<FaUserTie />}
        subtitle="Manage company staff credentials, counter ticket agents, bus conductor assignments, and station locations."
        stats={[
          { label: 'Total Company Staff', value: staffList.length, color: '#0284c7' },
          { label: 'Ticket Agents', value: agentCount, color: '#16a34a' },
          { label: 'Bus Conductors', value: conductorCount, color: '#7c3aed' },
        ]}
        actions={
          <button onClick={() => { setForm(EMPTY); setShowModal(true); }} className="eb-btn-primary-header">
            <FaPlus /> Add New Staff Member
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { id: 'ALL', label: `All Staff (${staffList.length})` },
          { id: 'agent', label: `Ticket Agents (${agentCount})` },
          { id: 'conductor', label: `Conductors (${conductorCount})` },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setRoleFilter(btn.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: roleFilter === btn.id ? '#078930' : '#e2e8f0',
              background: roleFilter === btn.id ? '#dcfce7' : '#fff',
              color: roleFilter === btn.id ? '#15803d' : '#64748b',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
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
        searchPlaceholder="Search staff by name, email, or city..."
        emptyMessage="No staff accounts found. Click 'Add Staff' to create Ticket Agents and Conductors."
        actions={
          <button
            onClick={() => { setForm(EMPTY); setShowModal(true); }}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg,#078930,#046623)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(7,137,48,0.3)',
            }}
          >
            <FaPlus /> Add Agent / Conductor
          </button>
        }
      />

      {/* Create staff modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
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
                  Staff Management
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>Create Staff Account</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreate} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Account Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  <option value="agent">Ticket Agent (Counter Booking &amp; Verification)</option>
                  <option value="conductor">Bus Conductor (Onboard QR Scan &amp; Boarding)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solomon Kebede"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. solomon@selambus.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="0911..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    City / Station
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Initial Password
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters (default: password123)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                    background: 'linear-gradient(135deg,#078930,#046623)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FaSave /> {saving ? 'Creating...' : 'Create Account'}
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
