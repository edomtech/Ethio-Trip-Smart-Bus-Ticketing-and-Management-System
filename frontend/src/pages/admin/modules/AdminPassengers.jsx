import React, { useState, useEffect } from 'react';
import { bookingAPI, userAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import { FaUsers, FaSearch, FaEnvelope, FaPhone, FaTicketAlt, FaSync } from 'react-icons/fa';
import DataTable from '../../../components/DataTable';
import AdminPageHeader from '../../../components/AdminPageHeader';

const AdminPassengers = () => {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const [bookings, users] = await Promise.all([
        bookingAPI.getAll().catch(() => []),
        userAPI.getAll({ role: 'passenger' }).catch(() => []),
      ]);

      const passengerMap = new Map();

      // Aggregate from company bookings
      (bookings || []).forEach((b) => {
        const email = b.passenger?.email || (b.user && b.user.email);
        if (!email) return;

        if (!passengerMap.has(email.toLowerCase())) {
          passengerMap.set(email.toLowerCase(), {
            name: b.passenger?.name || (b.user && b.user.name) || 'Passenger',
            email: email.toLowerCase(),
            phone: b.passenger?.phone || (b.user && b.user.phone) || '—',
            totalBookings: 1,
            totalSpent: b.totalPrice || 0,
            lastBookingDate: b.createdAt,
            city: b.user?.city || '—',
          });
        } else {
          const p = passengerMap.get(email.toLowerCase());
          p.totalBookings += 1;
          p.totalSpent += b.totalPrice || 0;
          if (new Date(b.createdAt) > new Date(p.lastBookingDate)) {
            p.lastBookingDate = b.createdAt;
          }
        }
      });

      // Add registered users if not in booking list
      (users || []).forEach((u) => {
        if (!passengerMap.has(u.email.toLowerCase())) {
          passengerMap.set(u.email.toLowerCase(), {
            name: u.name,
            email: u.email.toLowerCase(),
            phone: u.phone || '—',
            totalBookings: 0,
            totalSpent: 0,
            lastBookingDate: u.createdAt,
            city: u.city || '—',
          });
        }
      });

      setPassengers(Array.from(passengerMap.values()));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load passenger list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, []);

  const filteredPassengers = passengers.filter((p) => {
    return (
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
    );
  });

  const totalSpentAll = passengers.reduce((sum, p) => sum + (p.totalSpent || 0), 0);
  const totalBookingsAll = passengers.reduce((sum, p) => sum + (p.totalBookings || 0), 0);

  return (
    <div>
      <AdminPageHeader
        category="CUSTOMER DIRECTORY"
        title="Company Passenger Registry"
        icon={<FaUsers />}
        subtitle="View and manage passenger customer profiles, contact directories, booking histories, and loyalty engagement."
        stats={[
          { label: 'Registered Passengers', value: passengers.length, color: '#0284c7' },
          { label: 'Total Tickets Purchased', value: totalBookingsAll, color: '#16a34a' },
          { label: 'Cumulative Spending', value: `ETB ${totalSpentAll.toLocaleString()}`, color: '#7c3aed' },
        ]}
        actions={
          <button onClick={fetchPassengers} className="eb-btn-secondary-header">
            <FaSync className={loading ? 'fa-spin' : ''} /> Refresh List
          </button>
        }
      />

      <DataTable
        columns={[
          {
            header: 'Passenger Name',
            render: (p) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  {(p.name[0] || 'P').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.city}</div>
                </div>
              </div>
            ),
          },
          {
            header: 'Contact Info',
            render: (p) => (
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                  <FaEnvelope style={{ color: '#94a3b8' }} /> {p.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', marginTop: 2 }}>
                  <FaPhone style={{ color: '#94a3b8' }} /> {p.phone}
                </div>
              </div>
            ),
          },
          {
            header: 'Company Bookings',
            render: (p) => (
              <span style={{ fontWeight: 800, color: '#2563eb' }}>
                {p.totalBookings} tickets
              </span>
            ),
          },
          {
            header: 'Total Spent',
            render: (p) => (
              <span style={{ fontWeight: 800, color: '#16a34a' }}>
                ETB {p.totalSpent.toLocaleString()}
              </span>
            ),
          },
          {
            header: 'Last Active',
            render: (p) => (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {p.lastBookingDate ? new Date(p.lastBookingDate).toLocaleDateString() : '—'}
              </span>
            ),
          },
        ]}
        data={filteredPassengers}
        loading={loading}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search passenger by name, email, phone..."
        actions={
          <button
            onClick={fetchPassengers}
            style={{
              padding: '8px 14px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaSync className={loading ? 'fa-spin' : ''} /> Refresh
          </button>
        }
      />
    </div>
  );
};

export default AdminPassengers;
