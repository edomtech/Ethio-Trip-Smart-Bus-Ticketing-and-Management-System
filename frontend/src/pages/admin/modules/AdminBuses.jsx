import React, { useState, useEffect } from 'react';
import { FaBus, FaPlus, FaEdit, FaTrash, FaSpinner, FaTimes, FaSave, FaSearch } from 'react-icons/fa';
import { busAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../../components/ModernTable.css';

const EMPTY = { plateNumber: '', busNumber: '', type: 'Standard', capacity: 45, status: 'active' };

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
    try { setBuses(await busAPI.getAll()); }
    catch { toast.error('Failed to load buses'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (bus) => { setForm({ plateNumber: bus.plateNumber, busNumber: bus.busNumber, type: bus.type, capacity: bus.capacity, status: bus.status }); setModal(bus); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') { await busAPI.create(form); toast.success('Bus added!'); }
      else { await busAPI.update(modal._id, form); toast.success('Bus updated!'); }
      setModal(null);
      load();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bus?')) return;
    setDeletingId(id);
    try { await busAPI.delete(id); toast.success('Bus deleted'); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const filteredBuses = buses.filter(b =>
    (b.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.busNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box">
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search bus fleet..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={openAdd} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(7,137,48,0.3)' }}>
          <FaPlus /> Add Bus
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading bus fleet...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Bus Number</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuses.map(bus => {
                const typeClass = (bus.type || 'Standard').toLowerCase();
                const statusClass = (bus.status || 'active').toLowerCase();
                return (
                  <tr key={bus._id}>
                    <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{bus.plateNumber}</td>
                    <td style={{ fontWeight: 700 }}>{bus.busNumber}</td>
                    <td>
                      <span className={`eb-badge eb-badge-${typeClass}`}>{bus.type}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{bus.capacity} seats</td>
                    <td>
                      <span className={`eb-badge eb-badge-${statusClass}`}>{bus.status}</span>
                    </td>
                    <td>
                      <div className="eb-action-group">
                        <button onClick={() => openEdit(bus)} className="eb-btn-action eb-btn-edit">
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(bus._id)} disabled={deletingId === bus._id} className="eb-btn-action eb-btn-delete">
                          <FaTrash /> {deletingId === bus._id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ background: 'linear-gradient(135deg,#078930,#046623)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FCDD09', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Fleet Management</div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>{modal === 'add' ? 'Add New Bus' : `Edit ${modal.busNumber}`}</h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Plate Number', key: 'plateNumber', placeholder: 'AA-12345' },
                { label: 'Bus Number', key: 'busNumber', placeholder: 'B001' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input type="text" value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder} required
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Bus Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                    {['Standard','Luxury','VIP'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Capacity</label>
                  <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})} min={10} max={80}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                  {['active','maintenance','inactive'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} style={{ padding: '11px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
