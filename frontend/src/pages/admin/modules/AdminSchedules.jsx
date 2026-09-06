import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaUserShield, FaCalendarAlt } from 'react-icons/fa';
import { scheduleAPI, busAPI, routeAPI, userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const EMPTY = {
  tripId: '',
  busId: '',
  routeId: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
  price: '',
  assignedConductor: '',
};

const AdminSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, r, c] = await Promise.all([
        scheduleAPI.getAll(),
        busAPI.getAll(),
        routeAPI.getAll(),
        userAPI.getConductors().catch(() => []),
      ]);
      setSchedules((s || []).sort((a, b) => new Date(a.date) - new Date(b.date)));
      setBuses(b || []);
      setRoutes(r || []);
      setConductors(c || []);
    } catch {
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({
      ...EMPTY,
      tripId: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({
      tripId: s.tripId || '',
      busId: s.bus?._id || '',
      routeId: s.route?._id || '',
      date: s.date,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      price: s.price,
      assignedConductor: s.assignedConductor?._id || s.assignedConductor || '',
    });
    setModal(s);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.busId) {
      toast.error('Please select a bus from your fleet');
      return;
    }
    if (!form.routeId) {
      toast.error('Please select a route');
      return;
    }
    if (!form.date) {
      toast.error('Please choose a departure date');
      return;
    }
    if (!form.departureTime) {
      toast.error('Please enter a departure time');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error('Please enter a valid ticket price');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tripId: form.tripId,
        bus: form.busId,
        busId: form.busId,
        route: form.routeId,
        routeId: form.routeId,
        date: form.date,
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime || '04:00 PM',
        price: Number(form.price),
        assignedConductor: form.assignedConductor || null,
      };

      if (modal === 'add') {
        await scheduleAPI.create(payload);
        toast.success('Trip schedule registered & conductor assigned! 🎉');
      } else {
        await scheduleAPI.update(modal._id, payload);
        toast.success('Trip schedule updated successfully!');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trip schedule?')) return;
    setDeletingId(id);
    try {
      await scheduleAPI.delete(id);
      toast.success('Schedule deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const tripMatch = (s.tripId || '').toLowerCase().includes(q);
    const routeMatch = `${s.route?.from || ''} ${s.route?.to || ''}`.toLowerCase().includes(q);
    const busMatch = (s.bus?.busNumber || '').toLowerCase().includes(q);
    const conductorMatch = (s.assignedConductor?.name || '').toLowerCase().includes(q);
    return tripMatch || routeMatch || busMatch || conductorMatch;
  });

  const columns = [
    {
      header: 'Trip ID',
      render: (s) => (
        <span style={{ fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
          {s.tripId || 'TRP'}
        </span>
      ),
    },
    {
      header: 'Route',
      render: (s) => (
        <div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.route?.from} → {s.route?.to}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.route?.duration}</div>
        </div>
      ),
    },
    {
      header: 'Bus Details',
      render: (s) => (
        <div>
          <div style={{ fontWeight: 700, color: '#334155' }}>{s.bus?.busNumber || 'Assigned Bus'}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {s.bus?.type || 'Standard'} {s.bus?.plateNumber ? `· Plate: ${s.bus.plateNumber}` : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Conductor',
      render: (s) => (
        <div>
          {s.assignedConductor ? (
            <span style={{ fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
              <FaUserShield style={{ fontSize: '11px' }} /> {s.assignedConductor.name}
            </span>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Travel Date',
      render: (s) => <span style={{ fontWeight: 600 }}>{s.date}</span>,
    },
    {
      header: 'Departure',
      render: (s) => <span style={{ fontWeight: 800, color: '#078930' }}>{s.departureTime}</span>,
    },
    {
      header: 'Fare',
      render: (s) => <span style={{ fontWeight: 800, color: '#0f172a' }}>ETB {s.price}</span>,
    },
    {
      header: 'Seats Left',
      render: (s) => (
        <span style={{ fontWeight: 800, color: s.availableSeats < 5 ? '#dc2626' : '#16a34a' }}>
          {s.availableSeats}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (s) => {
        const statusClass = (s.status || 'scheduled').toLowerCase();
        return <span className={`eb-badge eb-badge-${statusClass}`}>{s.status}</span>;
      },
    },
    {
      header: 'Actions',
      render: (s) => (
        <div className="eb-action-group">
          <button onClick={() => openEdit(s)} className="eb-btn-action eb-btn-edit">
            <FaEdit /> Edit
          </button>
          <button onClick={() => handleDelete(s._id)} disabled={deletingId === s._id} className="eb-btn-action eb-btn-delete">
            <FaTrash /> {deletingId === s._id ? '...' : 'Del'}
          </button>
        </div>
      ),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTripsCount = schedules.filter((s) => s.date === todayStr).length;

  return (
    <div>
      <AdminPageHeader
        category="DISPATCH & TIMETABLES"
        title="Bus Schedules & Dispatches"
        icon={<FaCalendarAlt />}
        subtitle="Schedule passenger trips, assign conductors, set ticket fares, and manage departures in real time."
        stats={[
          { label: 'Total Schedules', value: schedules.length, color: '#0284c7' },
          { label: "Today's Departures", value: todayTripsCount, color: '#16a34a' },
          { label: 'Assigned Conductors', value: schedules.filter((s) => s.assignedConductor).length, color: '#7c3aed' },
        ]}
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header">
            <FaPlus /> Create New Schedule
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredSchedules}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by Trip ID, route, bus, conductor..."
        emptyMessage="No schedules found. Click 'Add Schedule' to create your first trip."
        actions={
          <button onClick={openAdd} className="eb-btn-primary-header" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <FaPlus /> Add Trip Schedule
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
              maxWidth: '520px',
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
                  Trip &amp; Conductor Schedule
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                  {modal === 'add' ? 'Create Trip Schedule' : 'Edit Trip Schedule'}
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
                    Trip Identifier (Trip ID)
                  </label>
                  <input
                    type="text"
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    required
                    placeholder="TRP-1001"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Assigned Conductor (Onboard Check-in)
                  </label>
                  <select
                    value={form.assignedConductor}
                    onChange={(e) => setForm({ ...form, assignedConductor: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="">Unassigned Conductor</option>
                    {conductors.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Bus Fleet
                </label>
                <select
                  value={form.busId}
                  onChange={(e) => setForm({ ...form, busId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <option value="">Select your company bus...</option>
                  {buses.filter((b) => b.status === 'active').map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busNumber} {b.plateNumber ? `[${b.plateNumber}]` : ''} · {b.type} · {b.capacity} seats
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Route
                </label>
                <select
                  value={form.routeId}
                  onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <option value="">Select your company route...</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.from} → {r.to} ({r.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Departure
                  </label>
                  <input
                    type="text"
                    value={form.departureTime}
                    onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                    placeholder="06:00 AM"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Arrival
                  </label>
                  <input
                    type="text"
                    value={form.arrivalTime}
                    onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                    placeholder="03:00 PM"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Base Ticket Fare (ETB)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 950"
                  required
                  min="1"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                    background: '#078930',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FaSave /> {saving ? 'Saving...' : modal === 'add' ? 'Create Schedule' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedules;
