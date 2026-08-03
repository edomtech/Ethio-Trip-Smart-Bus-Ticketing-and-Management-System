import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBus, FaUsers, FaUserTie, FaRoute, FaCalendarAlt, FaTicketAlt,
  FaCreditCard, FaChartBar, FaUser, FaSignOutAlt, FaSearch,
  FaBell, FaBars, FaArrowUp, FaPlus
} from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import { busAPI, routeAPI, scheduleAPI, bookingAPI, userAPI, reportAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import AdminBuses from './modules/AdminBuses';
import AdminRoutes from './modules/AdminRoutes';
import AdminSchedules from './modules/AdminSchedules';
import AdminBookings from './modules/AdminBookings';
import AdminUsers from './modules/AdminUsers';
import AdminAgents from './modules/AdminAgents';
import GenerateReports from './modules/GenerateReports';
import AdminProfile from './modules/AdminProfile';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dashboard Data State
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [bList, rList, sList, bkList, uList, aList] = await Promise.all([
        busAPI.getAll(),
        routeAPI.getAll(),
        scheduleAPI.getAll(),
        bookingAPI.getAll(),
        userAPI.getAll(),
        userAPI.getAgents(),
      ]);
      setBuses(bList || []);
      setRoutes(rList || []);
      setSchedules(sList || []);
      setBookings(bkList || []);
      setUsers(uList.filter(u => u.role === 'passenger') || []);
      setAgents(aList || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  // Line Chart Data
  const lineChartData = {
    labels: ['May 1', 'May 6', 'May 11', 'May 16', 'May 21', 'May 26', 'May 31'],
    datasets: [
      {
        label: 'Bookings',
        data: [150, 300, 220, 320, 200, 350, 280],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Donut Chart Data
  const donutChartData = {
    labels: ['Confirmed', 'Pending', 'Cancelled', 'Completed'],
    datasets: [
      {
        data: [60, 20, 10, 10],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="eb-admin-wrap">
      {/* ══ SIDEBAR ══ */}
      <aside className={`eb-admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="eb-as-brand">
          <div className="eb-as-brand-icon"><FaBus /></div>
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
            <FaChartBar /> <span>Dashboard</span>
          </button>

          <div className="eb-as-section-label">MANAGEMENT</div>

          <button
            className={`eb-as-nav-item ${activeTab === 'passengers' ? 'active' : ''}`}
            onClick={() => setActiveTab('passengers')}
          >
            <FaUsers /> <span>Passengers</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <FaUserTie /> <span>Ticket Agents</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'buses' ? 'active' : ''}`}
            onClick={() => setActiveTab('buses')}
          >
            <FaBus /> <span>Buses</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            <FaRoute /> <span>Routes</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            <FaCalendarAlt /> <span>Schedules</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <FaTicketAlt /> <span>Bookings</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <FaCreditCard /> <span>Payments</span>
          </button>

          <button
            className={`eb-as-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FaChartBar /> <span>Reports</span>
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

      {/* ══ MAIN VIEW AREA ══ */}
      <div className="eb-admin-main">
        {/* TOPBAR */}
        <header className="eb-admin-topbar">
          <div className="eb-topbar-left">
            <button className="eb-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <span className="eb-top-pill-badge">ADMIN DASHBOARD</span>
          </div>

          <div className="eb-topbar-right">
            <div className="eb-topbar-search">
              <FaSearch />
              <input placeholder="Search anything..." />
            </div>

            <button className="eb-notif-btn">
              <FaBell />
              <span className="eb-notif-badge">5</span>
            </button>

            <div className="eb-admin-user-profile">
              <div className="eb-au-avatar">{(user?.name || 'A')[0]}</div>
              <div className="eb-au-info">
                <strong>{user?.name || 'Admin Mesfin'}</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="eb-admin-content">
          {activeTab === 'dashboard' && (
            <div className="eb-dash-view">
              {/* Welcome Header */}
              <div className="eb-admin-welcome">
                <div>
                  <h2>Welcome back, Admin! 👋</h2>
                  <p>Here's what's happening with your system today.</p>
                </div>
                <div className="eb-welcome-badge">
                  🟢 &nbsp;System Online
                </div>
              </div>

              {/* 5 Metric Cards */}
              <div className="eb-metrics-grid">
                {/* 1. Passengers */}
                <div className="eb-metric-card">
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon blue"><FaUsers /></div>
                  </div>
                  <div className="eb-mc-title">Total Passengers</div>
                  <div className="eb-mc-val">12,458</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +8.2% from last month</div>
                </div>

                {/* 2. Buses */}
                <div className="eb-metric-card">
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon green"><FaBus /></div>
                  </div>
                  <div className="eb-mc-title">Total Buses</div>
                  <div className="eb-mc-val">128</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +5.1% from last month</div>
                </div>

                {/* 3. Bookings */}
                <div className="eb-metric-card">
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon purple"><FaCalendarAlt /></div>
                  </div>
                  <div className="eb-mc-title">Today's Bookings</div>
                  <div className="eb-mc-val">342</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +12.7% from yesterday</div>
                </div>

                {/* 4. Revenue */}
                <div className="eb-metric-card">
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon orange"><FaCreditCard /></div>
                  </div>
                  <div className="eb-mc-title">Total Revenue</div>
                  <div className="eb-mc-val">Br 245,670</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +15.3% from last month</div>
                </div>

                {/* 5. Routes */}
                <div className="eb-metric-card">
                  <div className="eb-mc-header">
                    <div className="eb-mc-icon pink"><FaRoute /></div>
                  </div>
                  <div className="eb-mc-title">Total Routes</div>
                  <div className="eb-mc-val">45</div>
                  <div className="eb-mc-trend green"><FaArrowUp /> +3 new this month</div>
                </div>
              </div>

              {/* Middle Section: Booking Overview Line Chart + Recent Bookings + System Summary Donut */}
              <div className="eb-admin-middle-grid">
                {/* 1. Line Chart */}
                <div className="eb-admin-card">
                  <div className="eb-ac-head">
                    <h4>Booking Overview</h4>
                    <select className="eb-select-sm"><option>This Month</option></select>
                  </div>
                  <div style={{ height: 220 }}>
                    <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>

                {/* 2. Recent Bookings Table */}
                <div className="eb-admin-card">
                  <div className="eb-ac-head">
                    <h4>Recent Bookings</h4>
                    <button className="eb-btn-text" onClick={() => setActiveTab('bookings')}>View All</button>
                  </div>
                  <div className="eb-mini-table">
                    {[
                      { id: '#BK98921', route: 'Addis Ababa → Dire Dawa', price: 'Br 700', status: 'Confirmed', sClass: 'confirmed' },
                      { id: '#BK98920', route: 'Addis Ababa → Mekelle', price: 'Br 850', status: 'Confirmed', sClass: 'confirmed' },
                      { id: '#BK98919', route: 'Addis Ababa → Bahir Dar', price: 'Br 750', status: 'Pending', sClass: 'pending' },
                      { id: '#BK98918', route: 'Addis Ababa → Hawassa', price: 'Br 650', status: 'Confirmed', sClass: 'confirmed' },
                      { id: '#BK98917', route: 'Jijiga → Addis Ababa', price: 'Br 800', status: 'Cancelled', sClass: 'cancelled' },
                    ].map((row) => (
                      <div key={row.id} className="eb-mtr-row">
                        <span className="eb-mtr-id">{row.id}</span>
                        <span className="eb-mtr-route">{row.route}</span>
                        <span className="eb-mtr-price">{row.price}</span>
                        <span className={`eb-mtr-badge ${row.sClass}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. System Summary Donut */}
                <div className="eb-admin-card">
                  <div className="eb-ac-head">
                    <h4>System Summary</h4>
                  </div>
                  <div style={{ height: 170, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <Doughnut data={donutChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                  <div className="eb-summary-legend">
                    <div><span style={{ background: '#10b981' }} /> Confirmed 60% (1,707)</div>
                    <div><span style={{ background: '#f59e0b' }} /> Pending 20% (569)</div>
                    <div><span style={{ background: '#ef4444' }} /> Cancelled 10% (284)</div>
                    <div><span style={{ background: '#3b82f6' }} /> Completed 10% (285)</div>
                  </div>
                </div>
              </div>

              {/* Quick Management Section */}
              <div className="eb-qm-section">
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Quick Management</h4>
                <div className="eb-qm-grid">
                  <div className="eb-qm-card" onClick={() => setActiveTab('passengers')}>
                    <div className="eb-qm-icon blue"><FaUsers /></div>
                    <div>
                      <strong>Manage Passengers</strong>
                      <p>View, update &amp; delete</p>
                    </div>
                  </div>

                  <div className="eb-qm-card" onClick={() => setActiveTab('agents')}>
                    <div className="eb-qm-icon green"><FaUserTie /></div>
                    <div>
                      <strong>Manage Agents</strong>
                      <p>Create, update &amp; delete</p>
                    </div>
                  </div>

                  <div className="eb-qm-card" onClick={() => setActiveTab('buses')}>
                    <div className="eb-qm-icon purple"><FaBus /></div>
                    <div>
                      <strong>Manage Buses</strong>
                      <p>Add, edit &amp; delete buses</p>
                    </div>
                  </div>

                  <div className="eb-qm-card" onClick={() => setActiveTab('routes')}>
                    <div className="eb-qm-icon orange"><FaRoute /></div>
                    <div>
                      <strong>Manage Routes</strong>
                      <p>Add, edit &amp; delete routes</p>
                    </div>
                  </div>

                  <div className="eb-qm-card" onClick={() => setActiveTab('schedules')}>
                    <div className="eb-qm-icon teal"><FaCalendarAlt /></div>
                    <div>
                      <strong>Manage Schedules</strong>
                      <p>Add, edit &amp; delete schedules</p>
                    </div>
                  </div>

                  <div className="eb-qm-card" onClick={() => setActiveTab('reports')}>
                    <div className="eb-qm-icon pink"><FaChartBar /></div>
                    <div>
                      <strong>Generate Reports</strong>
                      <p>View &amp; export reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-pages — canonical module components */}
          {activeTab === 'passengers' && (
            <div className="eb-admin-subpage"><AdminUsers /></div>
          )}
          {activeTab === 'agents' && (
            <div className="eb-admin-subpage"><AdminAgents /></div>
          )}
          {activeTab === 'buses' && (
            <div className="eb-admin-subpage"><AdminBuses /></div>
          )}
          {activeTab === 'routes' && (
            <div className="eb-admin-subpage"><AdminRoutes /></div>
          )}
          {activeTab === 'schedules' && (
            <div className="eb-admin-subpage"><AdminSchedules /></div>
          )}
          {activeTab === 'bookings' && (
            <div className="eb-admin-subpage"><AdminBookings /></div>
          )}
          {activeTab === 'payments' && (
            <div className="eb-admin-subpage"><AdminBookings /></div>
          )}
          {activeTab === 'reports' && (
            <div className="eb-admin-subpage"><GenerateReports /></div>
          )}
          {activeTab === 'profile' && (
            <div className="eb-admin-subpage"><AdminProfile /></div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
