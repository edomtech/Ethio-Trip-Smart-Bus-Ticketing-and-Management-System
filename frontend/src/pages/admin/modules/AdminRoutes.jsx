import React, { useState, useEffect } from 'react';
import { FaRoute, FaPlus, FaEdit, FaTrash, FaSpinner, FaTimes, FaSave, FaSearch } from 'react-icons/fa';
import { routeAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../../components/ModernTable.css';

const EMPTY = { from: '', to: '', distance: '', duration: '', stops: '', status: 'active' };
const CITIES = ['Addis Ababa','Dire Dawa','Mekelle','Hawassa','Bahir Dar','Jimma','Adama','Gondar','Dessie','Jijiga','Arba Minch','Shashamane'];

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try { setRoutes(await routeAPI.getAll()); }
    catch { toast.error('Failed to load routes'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (r) => {
    setForm({ from: r.from, to: r.to, distance: r.distance, duration: r.duration, stops: Array.isArray(r.stops) ? r.stops.join(', ') : r.stops || '', status: r.status });
    setModal(r);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') { await routeAPI.create(form); toast.success('Route added!'); }
      else { await routeAPI.update(modal._id, form); toast.success('Route updated!'); }
      setModal(null);
      load();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this route?')) return;
    setDeletingId(id);
    try { await routeAPI.delete(id); toast.success('Route deleted'); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const filteredRoutes = routes.filter(r =>
    (r.from || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.to || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box">
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search routes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={openAdd} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(7,137,48,0.3)' }}>
          <FaPlus /> Add Route
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading routes...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Departure City</th>
                <th>Destination</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Stops</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 800, color: '#078930' }}>{r.from}</td>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>{r.to}</td>
                  <td style={{ fontWeight: 600 }}>{r.distance} km</td>
                  <td style={{ color: '#64748b' }}>{r.duration}</td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {Array.isArray(r.stops) ? r.stops.join(', ') : r.stops || 'Direct'}
                  </td>
                  <td>
                    <div className="eb-action-group">
                      <button onClick={() => openEdit(r)} className="eb-btn-action eb-btn-edit">
                        <FaEdit /> Edit
                      </button>
                      <button onClick={() => handleDelete(r._id)} disabled={deletingId === r._id} className="eb-btn-action eb-btn-delete">
                        <FaTrash /> {deletingId === r._id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ background: 'linear-gradient(135deg,#078930,#046623)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FCDD09', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Route Management</div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>{modal === 'add' ? 'Add New Route' : `Edit Route`}</h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>From</label>
                  <select value={form.from} onChange={e => setForm({...form, from: e.target.value})} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>To</label>
                  <select value={form.to} onChange={e => setForm({...form, to: e.target.value})} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <option value="">Select city</option>
                    {CITIES.filter(c => c !== form.from).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Distance (km)</label>
                  <input type="number" value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Duration</label>
                  <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="e.g. 8 hours" required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Stops (comma-separated)</label>
                <input type="text" value={form.stops} onChange={e => setForm({...form, stops: e.target.value})} placeholder="Adama, Awash" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <button type="submit" disabled={saving} style={{ padding: '11px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaSave /> {saving ? 'Saving...' : modal === 'add' ? 'Add Route' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoutes;
