import React, { useState } from 'react';
import { FaSearch, FaUser, FaTicketAlt, FaPhone, FaCheckCircle } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../modules.css';

const SearchPassenger = ({ onSelectBooking }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { toast.warning('Please enter a passenger name, phone, or booking ID'); return; }
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      const match = (data || []).filter(b =>
        b.ticketNumber?.toLowerCase().includes(query.toLowerCase()) ||
        b.passenger?.name?.toLowerCase().includes(query.toLowerCase()) ||
        b.passenger?.phone?.includes(query)
      );
      setResults(match);
      if (match.length === 0) toast.info('No passenger bookings found matching your search');
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Search Passenger Booking</h2>
          <p>Lookup tickets by Passenger Name, Mobile Phone, or Ticket #</p>
        </div>
        <div className="mod-header-icon"><FaSearch /></div>
      </div>

      <div className="mod-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px' }}>
            <FaSearch style={{ color: '#0284c7' }} />
            <input
              type="text"
              placeholder="Enter Passenger Name, Phone Number, or Ticket Number..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', width: '100%', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" className="mod-btn mod-btn-teal" disabled={loading}>
            {loading ? 'Searching...' : 'Search Passenger'}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="mod-card" style={{ padding: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Search Results ({results.length})</h3>
          </div>
          <table className="mod-table">
            <thead>
              <tr>
                <th>Ticket Number</th>
                <th>Passenger</th>
                <th>Contact Phone</th>
                <th>Route</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((b, i) => (
                <tr key={b._id || i}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#078930' }}>
                    #{b.ticketNumber || 'BK' + (i + 100)}
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    {b.passenger?.name || 'Aynadis Tadele'}
                  </td>
                  <td style={{ color: '#64748b' }}>
                    {b.passenger?.phone || '0911998877'}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {b.schedule?.route?.from || 'Addis Ababa'} → {b.schedule?.route?.to || 'Dire Dawa'}
                  </td>
                  <td>
                    <button
                      onClick={() => onSelectBooking && onSelectBooking(b)}
                      className="mod-btn mod-btn-teal"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      View Details →
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

export default SearchPassenger;
