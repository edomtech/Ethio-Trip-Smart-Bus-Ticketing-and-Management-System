import React, { useState, useEffect } from 'react';
import { FaPrint, FaTicketAlt, FaSearch } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import '../../modules.css';

const PrintTicket = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings(data || []);
    } catch {
      toast.error('Failed to load bookings for printing');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintThermal = (b) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ETHIOBUS', 40, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Smart Bus Ticketing System', 40, 17, { align: 'center' });
    doc.line(5, 20, 75, 20);

    doc.setFontSize(9);
    doc.text(`Ticket #: ${b.ticketNumber || 'BK001'}`, 8, 28);
    doc.text(`Passenger: ${b.passenger?.name || 'Passenger'}`, 8, 35);
    doc.text(`Route: ${b.schedule?.route?.from || 'Addis Ababa'} - ${b.schedule?.route?.to || 'Dire Dawa'}`, 8, 42);
    doc.text(`Date: ${b.schedule?.date || 'Today'}`, 8, 49);
    doc.text(`Time: ${b.schedule?.departureTime || '08:00 AM'}`, 8, 56);
    doc.text(`Seat: #${Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '04'}`, 8, 63);
    doc.text(`Fare: Br ${b.totalPrice || b.price || 700}`, 8, 70);

    doc.line(5, 75, 75, 75);
    doc.setFontSize(8);
    doc.text('Have a safe journey!', 40, 83, { align: 'center' });
    doc.save(`EthioBus_Thermal_Ticket_${b.ticketNumber || 'BK001'}.pdf`);
    toast.success('Thermal ticket PDF generated!');
  };

  const filtered = bookings.filter(b =>
    b.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
    b.passenger?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Print &amp; Reprint Ticket</h2>
          <p>Generate thermal paper boarding passes for terminal passengers</p>
        </div>
        <div className="mod-header-icon"><FaPrint /></div>
      </div>

      <div className="mod-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '8px 16px', width: '320px' }}>
            <FaSearch style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by ticket # or passenger..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="mod-loading"><div className="mod-spinner" /><p>Loading tickets...</p></div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Passenger</th>
                <th>Route</th>
                <th>Seat</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b._id || i}>
                  <td><strong style={{ color: '#078930' }}>#{b.ticketNumber || 'BK' + (i + 1001)}</strong></td>
                  <td><strong>{b.passenger?.name || 'Aynadis Tadele'}</strong></td>
                  <td>{b.schedule?.route?.from || 'Addis Ababa'} → {b.schedule?.route?.to || 'Dire Dawa'}</td>
                  <td><strong style={{ color: '#078930' }}>#{Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '04'}</strong></td>
                  <td><strong>Br {b.totalPrice || b.price || 700}</strong></td>
                  <td>
                    <button onClick={() => handlePrintThermal(b)} className="mod-btn mod-btn-green" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                      <FaPrint /> Print Ticket
                    </button>
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

export default PrintTicket;
