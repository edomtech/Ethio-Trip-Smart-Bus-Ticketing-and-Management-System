import React, { useState } from 'react';
import { FaBus, FaExchangeAlt, FaStar, FaCheckCircle, FaMoneyBillWave, FaClock } from 'react-icons/fa';

const TripComparison = ({ onSelectSchedule }) => {
  const [origin, setOrigin] = useState('Addis Ababa');
  const [destination, setDestination] = useState('Bahir Dar');

  const tripOptions = [
    { id: 't1', company: 'Selam Bus Line', logo: '🚌', departure: '06:00 AM', arrival: '03:00 PM', busType: 'Luxury VIP Express', fare: '950 ETB', availableSeats: 16, rating: 4.8, boardingPoint: 'Meskel Square Terminal' },
    { id: 't2', company: 'Abay Bus Transport', logo: '🚍', departure: '06:30 AM', arrival: '04:00 PM', busType: 'Executive Coach', fare: '850 ETB', availableSeats: 22, rating: 4.5, boardingPoint: 'Lamberet Terminal' },
    { id: 't3', company: 'Habesha Bus Express', logo: '🚌', departure: '07:00 AM', arrival: '04:30 PM', busType: 'Standard Coach', fare: '750 ETB', availableSeats: 8, rating: 4.2, boardingPoint: 'Kality Terminal' },
  ];

  return (
    <div className="db-card-widget">
      <div className="db-card-header">
        <div>
          <h3>Compare Inter-City Bus Trips</h3>
          <p>Compare participating Ethiopian bus companies by price, departure time, bus type, and passenger ratings</p>
        </div>
      </div>

      <div className="db-table-wrapper">
        <table className="db-table">
          <thead>
            <tr>
              <th>Bus Operator</th>
              <th>Departure / Arrival</th>
              <th>Bus Type</th>
              <th>Boarding Point</th>
              <th>Available Seats</th>
              <th>Fare</th>
              <th>Rating</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tripOptions.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0f172a' }}>
                    <span style={{ fontSize: '1.2rem' }}>{t.logo}</span>
                    <span>{t.company}</span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{t.departure} ➔ {t.arrival}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Duration: 9h 00m</div>
                </td>
                <td>
                  <span className="status-pill active">{t.busType}</span>
                </td>
                <td style={{ fontSize: '0.82rem', color: '#475569' }}>{t.boardingPoint}</td>
                <td style={{ fontWeight: 800, color: '#16a34a' }}>{t.availableSeats} Seats</td>
                <td style={{ fontWeight: 900, color: '#7c3aed', fontSize: '1.05rem' }}>{t.fare}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#eab308', fontWeight: 700 }}>
                    <FaStar /> {t.rating}
                  </div>
                </td>
                <td>
                  <button className="btn-primary-role purple" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => onSelectSchedule && onSelectSchedule(t)}>
                    Book Seats
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripComparison;
