import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBus, FaSearch, FaTicketAlt, FaQrcode, FaPrint, FaRedo, FaTimesCircle,
  FaCalendarDay, FaHeadset, FaUser, FaSignOutAlt, FaBell, FaBars,
  FaCheckCircle, FaMapMarkerAlt, FaArrowUp, FaArrowDown, FaChevronRight, FaPhoneAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI, ticketAPI, supportAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import TicketModal from '../../components/TicketModal';
import SearchPassenger from './modules/SearchPassenger';
import BookingDetails from './modules/BookingDetails';
import VerifyTicket from './modules/VerifyTicket';
import PrintTicket from './modules/PrintTicket';
import AgentCancelBooking from './modules/AgentCancelBooking';
import DailyBookings from './modules/DailyBookings';
import CustomerSupport from './modules/CustomerSupport';
import AgentProfile from './modules/AgentProfile';
import './AgentDashboard.css';

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search & Filter state
  const [passengerSearch, setPassengerSearch] = useState('');
  const [verifyTicketInput, setVerifyTicketInput] = useState('');
  const [verifiedTicketResult, setVerifiedTicketResult] = useState(null);

  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const handleLogout = () => {
    logout();
    toast.success('Agent logged out');
    navigate('/');
  };

  const handleVerifyTicket = async (e) => {
    e?.preventDefault();
    if (!verifyTicketInput) { toast.error('Please enter ticket number'); return; }
    try {
      const res = await ticketAPI.verify(verifyTicketInput);
      setVerifiedTicketResult(res.ticket);
      toast.success('Ticket Verified Successfully!');
    } catch (err) {
      toast.error('Invalid Ticket Number');
    }
  };

  return (
    <div className="eb-agent-wrap">
      {/* ══ SIDEBAR ══ */}
      <aside className={`eb-agent-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="eb-as-brand teal">
          <div className="eb-as-brand-icon teal"><FaBus /></div>
          <div>
            <h3>ETHIO <span>BUS</span></h3>
            <p>Smart Ticketing System</p>
          </div>
        </div>

        <nav className="eb-as-nav">
          <button
            className={`eb-as-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <FaBus /> <span>Dashboard</span>
          </button>

          <div className="eb-as-section-label">OPERATIONS</div>

          <button
            className={`eb-as-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <FaSearch /> <span>Search Passenger</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <FaTicketAlt /> <span>Bookings</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            <FaQrcode /> <span>Verify Ticket</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'print' ? 'active' : ''}`}
            onClick={() => setActiveTab('print')}
          >
            <FaPrint /> <span>Print Ticket</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'reprint' ? 'active' : ''}`}
            onClick={() => setActiveTab('reprint')}
          >
            <FaRedo /> <span>Reprint Ticket</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'cancel' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancel')}
          >
            <FaTimesCircle /> <span>Cancel Booking</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <FaCalendarDay /> <span>Daily Bookings</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <FaHeadset /> <span>Customer Support</span>
          </button>
        </nav>

        <div className="eb-as-footer">
          <button className="eb-as-nav-item" onClick={() => setActiveTab('profile')}>
            <FaUser /> <span>Profile</span>
          </button>
          <button className="eb-as-nav-item" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ══ MAIN AGENT VIEW ══ */}
      <div className="eb-agent-main">
        {/* TOPBAR */}
        <header className="eb-agent-topbar">
          <div className="eb-topbar-left">
            <button className="eb-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <span className="eb-top-pill-badge teal">TICKET AGENT DASHBOARD</span>
          </div>

          <div className="eb-topbar-right">
            <div className="eb-topbar-search">
              <FaSearch />
              <input placeholder="Search by name, phone, booking ID..." />
            </div>

            <button className="eb-notif-btn">
              <FaBell />
              <span className="eb-notif-badge">2</span>
            </button>

            <div className="eb-agent-user-profile">
              <div className="eb-au-avatar teal">{(user?.name || 'S')[0]}</div>
              <div className="eb-au-info">
                <strong>{user?.name || 'Samuel Bekele'}</strong>
                <span>Ticket Agent</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="eb-agent-content">
          {activeTab === 'dashboard' && (
            <div className="eb-dash-view">
              {/* Welcome Header */}
              <div className="eb-agent-welcome">
                <div>
                  <h2>Welcome back, Agent {user?.name?.split(' ')[0] || 'Samuel'}! 👋</h2>
                  <p>Here's your activity overview for today.</p>
                </div>
                <div className="eb-agent-welcome-badge">
                  🟢 &nbsp;Shift Active
                </div>
              </div>

              {/* 5 Metric Cards */}
              <div className="eb-agent-metrics-grid">
                <div className="eb-metric-card" style={{ borderTop: '3px solid #16a34a' }}>
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon green"><FaMapMarkerAlt /></div>
                  </div>
                  <div className="eb-mc-title">Today's Bookings</div>
                  <div className="eb-mc-val">56</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +18% from yesterday</div>
                </div>

                <div className="eb-metric-card" style={{ borderTop: '3px solid #0d9488' }}>
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon teal"><FaQrcode /></div>
                  </div>
                  <div className="eb-mc-title">Tickets Verified</div>
                  <div className="eb-mc-val">42</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +12% from yesterday</div>
                </div>

                <div className="eb-metric-card" style={{ borderTop: '3px solid #0284c7' }}>
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon blue"><FaPrint /></div>
                  </div>
                  <div className="eb-mc-title">Tickets Printed</div>
                  <div className="eb-mc-val">38</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +9% from yesterday</div>
                </div>

                <div className="eb-metric-card" style={{ borderTop: '3px solid #dc2626' }}>
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon red"><FaTimesCircle /></div>
                  </div>
                  <div className="eb-mc-title">Cancelled Bookings</div>
                  <div className="eb-mc-val">6</div>
                  <div className="eb-mc-trend red"><FaArrowDown /> -8% from yesterday</div>
                </div>

                <div className="eb-metric-card" style={{ borderTop: '3px solid #d97706' }}>
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon orange"><FaTicketAlt /></div>
                  </div>
                  <div className="eb-mc-title">Pending Bookings</div>
                  <div className="eb-mc-val">10</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +5% from yesterday</div>
                </div>
              </div>

              {/* Middle Section: Search Passenger + Today's Bookings + Recent Verified Tickets */}
              <div className="eb-agent-middle-grid">
                {/* 1. Search Passenger Card & Today's Bookings */}
                <div className="eb-agent-left-col">
                  {/* Search Passenger Card */}
                  <div className="eb-agent-card" style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 800 }}>Search Passenger</h4>
                    <div className="eb-sp-form">
                      <input
                        placeholder="Enter name, phone or email..."
                        value={passengerSearch}
                        onChange={(e) => setPassengerSearch(e.target.value)}
                      />
                      <select className="eb-select-sm"><option>Select</option></select>
                      <button className="eb-sp-btn" onClick={() => toast.info('Searching passenger database...')}>
                        <FaSearch /> Search
                      </button>
                    </div>
                  </div>

                  {/* Today's Bookings Table */}
                  <div className="eb-agent-card">
                    <div className="eb-ac-head">
                      <h4>Today's Bookings</h4>
                    </div>
                    <div className="eb-mini-table">
                      {[
                        { id: '#BK98921', route: 'Addis Ababa → Dire Dawa', time: '08:00 AM', price: 'Br 700', status: 'Confirmed' },
                        { id: '#BK98922', route: 'Addis Ababa → Mekelle', time: '09:30 AM', price: 'Br 850', status: 'Confirmed' },
                        { id: '#BK98923', route: 'Addis Ababa → Bahir Dar', time: '11:00 AM', price: 'Br 750', status: 'Confirmed' },
                        { id: '#BK98924', route: 'Addis Ababa → Hawassa', time: '01:00 PM', price: 'Br 650', status: 'Confirmed' },
                        { id: '#BK98925', route: 'Jijiga → Addis Ababa', time: '03:30 PM', price: 'Br 800', status: 'Confirmed' },
                      ].map((row) => (
                        <div key={row.id} className="eb-mtr-row">
                          <span className="eb-mtr-id">{row.id}</span>
                          <span className="eb-mtr-route">{row.route}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.time}</span>
                          <span className="eb-mtr-price">{row.price}</span>
                          <span className="eb-mtr-badge confirmed">{row.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Recent Verified Tickets */}
                <div className="eb-agent-card">
                  <div className="eb-ac-head">
                    <h4>Recent Verified Tickets</h4>
                    <button className="eb-btn-text" onClick={() => setActiveTab('verify')}>View All</button>
                  </div>
                  <div className="eb-rvt-list">
                    {[
                      { name: 'Abraham Tesfaye', ticket: '#BK98921', time: '23 May, 08:00 AM', status: 'Verified' },
                      { name: 'Selamawit Kassa', ticket: '#BK98922', time: '23 May, 09:35 AM', status: 'Verified' },
                      { name: 'Yonas Gebre', ticket: '#BK98923', time: '23 May, 11:05 AM', status: 'Verified' },
                      { name: 'Hanna Belay', ticket: '#BK98924', time: '23 May, 01:10 PM', status: 'Verified' },
                    ].map((vt, i) => (
                      <div key={i} className="eb-rvt-item">
                        <div className="eb-rvt-avatar">{(vt.name || 'P')[0]}</div>
                        <div className="eb-rvt-info">
                          <strong>{vt.name}</strong>
                          <span className="eb-rvt-ticket">{vt.ticket}</span>
                        </div>
                        <div className="eb-rvt-right">
                          <span className="eb-rvt-time">{vt.time}</span>
                          <span className="eb-rvt-status"><FaCheckCircle /> {vt.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Actions Grid & Need Help Banner */}
              <div className="eb-agent-bottom-grid">
                {/* Quick Actions (5 Cards) */}
                <div className="eb-agent-card">
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800 }}>Quick Actions</h4>
                  <div className="eb-agent-qa-grid">
                    <div className="eb-qa-card" onClick={() => setActiveTab('verify')}>
                      <div className="eb-qa-icon green"><FaCheckCircle /></div>
                      <strong>Verify Ticket</strong>
                      <p>Scan &amp; verify ticket</p>
                    </div>

                    <div className="eb-qa-card" onClick={() => setActiveTab('print')}>
                      <div className="eb-qa-icon blue"><FaPrint /></div>
                      <strong>Print Ticket</strong>
                      <p>Print passenger ticket</p>
                    </div>

                    <div className="eb-qa-card" onClick={() => setActiveTab('reprint')}>
                      <div className="eb-qa-icon purple"><FaRedo /></div>
                      <strong>Reprint Ticket</strong>
                      <p>Reprint ticket</p>
                    </div>

                    <div className="eb-qa-card" onClick={() => setActiveTab('cancel')}>
                      <div className="eb-qa-icon red"><FaTimesCircle /></div>
                      <strong>Cancel Booking</strong>
                      <p>Cancel a booking</p>
                    </div>

                    <div className="eb-qa-card" onClick={() => setActiveTab('support')}>
                      <div className="eb-qa-icon orange"><FaHeadset /></div>
                      <strong>Customer Support</strong>
                      <p>Help &amp; support</p>
                    </div>
                  </div>
                </div>

                {/* Green Support Banner Card */}
                <div className="eb-help-banner-card">
                  <div className="eb-hb-content">
                    <h3>Need Help?</h3>
                    <p>Contact support if you face any issues.</p>
                    <button className="eb-hb-btn" onClick={() => setActiveTab('support')}>
                      Contact Support &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Passenger Tab */}
          {activeTab === 'search' && (
            <div className="eb-agent-subpage">
              <SearchPassenger onSelectBooking={(b) => { setSelectedBooking(b); setActiveTab('booking-details'); }} />
            </div>
          )}

          {/* Booking Details Tab */}
          {activeTab === 'booking-details' && (
            <div className="eb-agent-subpage">
              <BookingDetails booking={selectedBooking} onPrint={() => {}} onCancel={() => {}} />
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === 'verify' && (
            <div className="eb-agent-subpage">
              <VerifyTicket />
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="eb-agent-subpage">
              <DailyBookings />
            </div>
          )}

          {/* Print Ticket Tab */}
          {activeTab === 'print' && (
            <div className="eb-agent-subpage">
              <PrintTicket />
            </div>
          )}

          {/* Reprint Ticket Tab — reuses PrintTicket */}
          {activeTab === 'reprint' && (
            <div className="eb-agent-subpage">
              <PrintTicket />
            </div>
          )}

          {/* Cancel Booking Tab */}
          {activeTab === 'cancel' && (
            <div className="eb-agent-subpage">
              <AgentCancelBooking />
            </div>
          )}

          {/* Daily Bookings Tab */}
          {activeTab === 'daily' && (
            <div className="eb-agent-subpage">
              <DailyBookings />
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="eb-agent-subpage">
              <CustomerSupport />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="eb-agent-subpage">
              <AgentProfile />
            </div>
          )}
        </main>
      </div>

      {selectedTicketForPrint && (
        <TicketModal booking={selectedTicketForPrint} onClose={() => setSelectedTicketForPrint(null)} />
      )}
    </div>
  );
};

export default AgentDashboard;
