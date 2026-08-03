import React, { useState } from 'react';
import { FaSearch, FaExchangeAlt, FaBus, FaClock, FaMapMarkerAlt, FaCouch } from 'react-icons/fa';
import { scheduleAPI } from '../../../utils/api';
import { toast } from 'react-toastify';

const CITIES = ['Addis Ababa','Dire Dawa','Mekelle','Hawassa','Bahir Dar','Jimma','Adama','Gondar','Dessie','Jijiga'];

const BusSearch = ({ onSelectSchedule }) => {
  const [params, setParams] = useState({ from:'Addis Ababa', to:'Dire Dawa', date: new Date().toISOString().split('T')[0], passengers:1 });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (params.from === params.to) { toast.error('Origin and destination cannot be the same'); return; }
    setLoading(true); setSearched(true);
    try {
      const res = await scheduleAPI.search({ from: params.from, to: params.to, date: params.date });
      setSchedules(res || []);
      if (!res?.length) toast.info('No buses found for this route/date');
    } catch { toast.error('Search failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const swap = () => setParams(p => ({ ...p, from: p.to, to: p.from }));

  return (
    <div style={{ padding: '0 0 2rem' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Search Buses</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Find available buses across Ethiopia</p>
      </div>

      {/* Search Card */}
      <div style={{ background: 'linear-gradient(135deg, #078930 0%, #056325 100%)', borderRadius: 20, padding: '28px 24px', marginBottom: 24, boxShadow: '0 8px 32px rgba(7,137,48,.25)' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ color: '#bbf7d0', fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>FROM</label>
              <select value={params.from} onChange={e => setParams(p => ({ ...p, from: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button type="button" onClick={swap}
              style={{ padding: '12px 14px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>
              <FaExchangeAlt />
            </button>
            <div>
              <label style={{ color: '#bbf7d0', fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>TO</label>
              <select value={params.to} onChange={e => setParams(p => ({ ...p, to: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#bbf7d0', fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={params.date} min={new Date().toISOString().split('T')[0]}
                onChange={e => setParams(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', fontSize: '0.95rem', fontWeight: 600, outline: 'none' }} />
            </div>
            <button type="submit"
              style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: '#FCDD09', color: '#1F2937', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <FaSearch /> Search
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#078930', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Searching for buses...
        </div>
      )}

      {!loading && searched && schedules.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <FaBus style={{ fontSize: '3rem', opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontWeight: 700, marginBottom: 8 }}>No buses found</p>
          <p style={{ fontSize: '0.85rem' }}>Try a different date or route</p>
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{schedules.length} bus(es) found · {params.from} → {params.to}</p>
          {schedules.map(sch => (
            <div key={sch._id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'box-shadow .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 48, height: 48, background: '#f0fdf4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078930', fontSize: '1.3rem' }}>
                  <FaBus />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 4 }}>
                    {sch.route?.from} → {sch.route?.to}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.83rem', color: '#64748b' }}>
                    <span><FaClock style={{ marginRight: 4 }} />{sch.departureTime} – {sch.arrivalTime}</span>
                    <span><FaCouch style={{ marginRight: 4 }} />{sch.availableSeats} seats left</span>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{sch.bus?.type || 'Standard'}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#078930', marginBottom: 8 }}>ETB {sch.price}</div>
                <button onClick={() => onSelectSchedule?.(sch)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #078930, #056325)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                  Select Seat →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusSearch;
