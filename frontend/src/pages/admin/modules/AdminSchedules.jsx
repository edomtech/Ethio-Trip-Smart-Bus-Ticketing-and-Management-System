import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaSpinner, FaTimes, FaSave, FaSearch } from 'react-icons/fa';
import { scheduleAPI, busAPI, routeAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../../components/ModernTable.css';

const EMPTY = { busId: '', routeId: '', date: '', departureTime: '', arrivalTime: '', price: '' };

const AdminSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, r] = await Promise.all([scheduleAPI.getAll(), busAPI.getAll(), routeAPI.getAll()]);
      setSchedules(s.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setBuses(b); setRoutes(r);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (s) => {
    setForm({ busId: s.bus?._id || '', routeId: s.route?._id || '', date: s.date, departureTime: s.departureTime, arrivalTime: s.arrivalTime, price: s.price });
    setModal(s);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') { await scheduleAPI.create(form); toast.success('Schedule created!'); }
      else { await scheduleAPI.update(modal._id, form); toast.success('Schedule updated!'); }
      setModal(null);
      load();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    setDeletingId(id);
    try { await scheduleAPI.delete(id); toast.success('Schedule deleted'); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const filteredSchedules = schedules.filter(s =>
    (`${s.route?.from || ''} ${s.route?.to || ''}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.bus?.busNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.date || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box">
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search schedules by route, bus, date..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={openAdd} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(7,137,48,0.3)' }}>
          <FaPlus /> Add Schedule
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading schedules...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Bus Details</th>
                <th>Travel Date</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Fare</th>
                <th>Seats Left</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map(s => {
                const statusClass = (s.status || 'scheduled').toLowerCase();
                return (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.route?.from} → {s.route?.to}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.route?.duration}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#334155' }}>{s.bus?.busNumber} · {s.bus?.type}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{s.bus?.plateNumber}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.date}</td>
                    <td style={{ fontWeight: 800, color: '#078930' }}>{s.departureTime}</td>
                    <td style={{ color: '#64748b' }}>{s.arrivalTime}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>ETB {s.price}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: s.availableSeats < 5 ? '#dc2626' : '#16a34a' }}>
                        {s.availableSeats}
                      </span>
                    </td>
                    <td>
                      <span className={`eb-badge eb-badge-${statusClass}`}>{s.status}</span>
                    </td>
                    <td>
                      <div className="eb-action-group">
                        <button onClick={() => openEdit(s)} className="eb-btn-action eb-btn-edit">
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(s._id)} disabled={deletingId === s._id} className="eb-btn-action eb-btn-delete">
                          <FaTrash /> {deletingId === s._id ? '...' : 'Del'}
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
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            <div style={{ background: 'linear-gradient(135deg,#078930,#046623)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FCDD09', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Schedule Management</div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>{modal === 'add' ? 'Create Schedule' : 'Edit Schedule'}</h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Bus</label>
                <select value={form.busId} onChange={e => setForm({...form, busId: e.target.value})} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <option value="">Select bus...</option>
                  {buses.filter(b => b.status === 'active').map(b => <option key={b._id} value={b._id}>{b.busNumber} · {b.type} · {b.capacity} seats</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Route</label>
                <select value={form.routeId} onChange={e => setForm({...form, routeId: e.target.value})} required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <option value="">Select route...</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.from} → {r.to} ({r.duration})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Depart</label>
                  <input type="text" value={form.departureTime} onChange={e => setForm({...form, departureTime: e.target.value})} placeholder="08:00 AM" required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Arrive</label>
                  <input type="text" value={form.arrivalTime} onChange={e => setForm({...form, arrivalTime: e.target.value})} placeholder="04:00 PM" required style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Price (ETB)</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required min={50} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} />
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ padding: '11px', background: 'linear-gradient(135deg,#078930,#046623)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaSave /> {saving ? 'Saving...' : modal === 'add' ? 'Create Schedule' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedules;
