import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import { userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await userAPI.getAll();
      setUsers((all || []).filter((u) => u.role === 'passenger'));
    } catch {
      toast.error('Failed to load passengers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this passenger account record?')) return;
    setDeletingId(id);
    try {
      await userAPI.delete(id);
      toast.success('Passenger deleted');
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.city || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: 'Passenger',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#078930,#046623)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {(u.name || 'P')[0].toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</span>
        </div>
      ),
    },
    {
      header: 'Email Address',
      render: (u) => <span style={{ color: '#64748b' }}>{u.email}</span>,
    },
    {
      header: 'Phone Number',
      render: (u) => <span style={{ fontWeight: 600 }}>{u.phone || '—'}</span>,
    },
    {
      header: 'City / Region',
      render: (u) => <span style={{ color: '#334155', fontWeight: 600 }}>{u.city || 'Addis Ababa'}</span>,
    },
    {
      header: 'Actions',
      render: (u) => (
        <button
          onClick={() => handleDelete(u._id)}
          disabled={deletingId === u._id}
          className="eb-btn-action eb-btn-delete"
        >
          <FaTrash /> {deletingId === u._id ? '...' : 'Delete'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search passengers by name, email, or phone..."
        emptyMessage="No passenger accounts found."
      />
    </div>
  );
};

export default AdminUsers;
