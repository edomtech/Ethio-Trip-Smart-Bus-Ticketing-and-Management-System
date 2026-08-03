import React, { useState, useEffect } from 'react';
import { FaUserTie, FaPlus, FaTrash, FaSearch, FaSpinner, FaTimes, FaSave } from 'react-icons/fa';
import { userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../../components/ModernTable.css';

const EMPTY = { name: '', email: '', phone: '', city: 'Addis Ababa' };
const CITIES = ['Addis Ababa','Dire Dawa','Mekelle','Hawassa','Bahir Dar','Jimma','Adama','Gondar','Dessie','Jijiga'];

const AdminAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setAgents(await userAPI.getAgents()); }
    catch { toast.error('Failed to load agents'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.createAgent(form);
      toast.success(`Agent ${form.name} created! Default password: password123`);
      setShowModal(false);
      setForm(EMPTY);
      load();
    } catch (err) { toast.error(err.message || 'Failed to create agent'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this agent?')) return;
    setDeletingId(id);
    try { await userAPI.delete(id); toast.success('Agent deleted'); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box" style={{ width: '100%', maxWidth: '380px' }}>
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search agents by name, email, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(7,137,48,0.3)' }}>
          <FaPlus /> Add Agent
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading agents...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Station / City</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 600 }}>
                    No ticket agents found.
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                        {(a.name || 'A')[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#64748b' }}>{a.email}</td>
                  <td style={{ fontWeight: 600 }}>{a.phone || '—'}</td>
                  <td>
                    <span className="eb-badge eb-badge-vip" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#bae6fd' }}>
                      {a.city || 'Addis Ababa'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(a._id)} disabled={deletingId === a._id} className="eb-btn-action eb-btn-delete">
                      <FaTrash /> {deletingId === a._id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create agent modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ background: 'linear-gradient(135deg,#078930,#046623)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FCDD09', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Agent Management</div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>Create Agent Account</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Kebede Alemu"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="agent@ethiobus.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="0911234567"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Station / City</label>
                <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '10px 12px', fontSize: '0.8rem', color: '#854d0e' }}>
                📌 Default password: <strong>password123</strong> — Agent must change on first login.
              </div>
              <button type="submit" disabled={saving} style={{ padding: '11px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaSave /> {saving ? 'Creating...' : 'Create Agent Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgents;
