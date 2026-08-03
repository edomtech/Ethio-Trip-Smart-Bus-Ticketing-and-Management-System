import React, { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaTrash, FaSpinner, FaUser } from 'react-icons/fa';
import { userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../../components/ModernTable.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await userAPI.getAll();
      setUsers(all.filter(u => u.role === 'passenger'));
    } catch { toast.error('Failed to load passengers'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this passenger account?')) return;
    setDeletingId(id);
    try { await userAPI.delete(id); toast.success('Passenger deleted'); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
  });

  return (
    <div>
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box" style={{ width: '100%', maxWidth: '380px' }}>
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search by passenger name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading passengers...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Passenger</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>City</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 600 }}>
                    No passenger accounts found.
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, flexShrink: 0 }}>
                        {(u.name || 'P')[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#64748b' }}>{u.email}</td>
                  <td style={{ fontWeight: 600 }}>{u.phone}</td>
                  <td style={{ color: '#334155', fontWeight: 600 }}>{u.city || 'Addis Ababa'}</td>
                  <td>
                    <button onClick={() => handleDelete(u._id)} disabled={deletingId === u._id} className="eb-btn-action eb-btn-delete">
                      <FaTrash /> {deletingId === u._id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
