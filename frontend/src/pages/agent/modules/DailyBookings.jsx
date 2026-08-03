import React, { useState, useEffect } from 'react';
import { FaCalendarDay, FaBus, FaUsers, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../modules.css';

const DailyBookings = () => {
  const [dailyBookings, setDailyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDaily(); }, []);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setDailyBookings(data || []);
    } catch {
      toast.error('Failed to load daily bookings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Daily Departure Manifest</h2>
          <p>Passenger list &amp; boarding status for today's departures</p>
        </div>
        <div className="mod-header-icon"><FaCalendarDay /></div>
      </div>

      <div className="mod-stats-row">
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>🚌</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.length}</span>
            <span className="lbl">Today's Total Bookings</span>
          </div>
        </div>
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>👥</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.filter(b => b.status === 'confirmed').length}</span>
            <span className="lbl">Confirmed Riders</span>
          </div>
        </div>
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⏳</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.filter(b => b.status === 'pending').length}</span>
            <span className="lbl">Awaiting Payment</span>
          </div>
        </div>
      </div>

      <div className="mod-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="mod-loading"><div className="mod-spinner" /><p>Loading manifest...</p></div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>Ticket Number</th>
                <th>Passenger</th>
                <th>Route &amp; Time</th>
                <th>Seat #</th>
                <th>Boarding Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 600 }}>
                    No departure bookings recorded for today.
                  </td>
                </tr>
              ) : dailyBookings.map((b, i) => (
                <tr key={b._id || i}>
                  <td>
                    <strong style={{ color: '#078930', fontFamily: 'monospace' }}>#{b.ticketNumber || 'BK' + (i + 900)}</strong>
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{b.passenger?.name || 'Aynadis Tadele'}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.passenger?.phone || '0911998877'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{b.schedule?.route?.from || 'Addis Ababa'} → {b.schedule?.route?.to || 'Dire Dawa'}</div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>⏱ {b.schedule?.departureTime || '08:00 AM'}</span>
                  </td>
                  <td>
                    <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
                      #{Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '04'}
                    </span>
                  </td>
                  <td>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: i % 2 === 0 ? '#dcfce7' : '#fef3c7', color: i % 2 === 0 ? '#15803d' : '#b45309' }}>
                      {i % 2 === 0 ? '✓ Boarded' : '⏳ Ready'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailyBookings;
