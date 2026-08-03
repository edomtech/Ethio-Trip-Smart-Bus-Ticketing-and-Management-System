import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBus, FaSearch, FaTicketAlt, FaCalendarAlt, FaWallet, FaUser, FaBell,
  FaHeadset, FaSignOutAlt, FaExchangeAlt, FaQrcode, FaTimes,
  FaCheckCircle, FaMapMarkerAlt, FaLock, FaPhone, FaEnvelope
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import { bookingAPI, scheduleAPI, authAPI, paymentAPI, supportAPI } from '../../utils/api';
import SeatSelectorModal from '../../components/SeatSelectorModal';
import PaymentModal from '../../components/PaymentModal';
import TicketModal from '../../components/TicketModal';
import BusSearch from './modules/BusSearch';
import BookingHistory from './modules/BookingHistory';
import TicketDownload from './modules/TicketDownload';
import CancelBooking from './modules/CancelBooking';
import OnlinePayment from './modules/OnlinePayment';
import PassengerProfile from './modules/PassengerProfile';
import './PassengerDashboard.css';

const CITIES = ['Addis Ababa','Dire Dawa','Mekelle','Hawassa','Bahir Dar','Jimma','Adama','Gondar','Dessie','Jijiga'];

const PassengerDashboard = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchParams, setSearchParams] = useState({ from:'Addis Ababa', to:'Dire Dawa', date: new Date().toISOString().split('T')[0], passengers:1, tripType:'oneway' });
  const [schedules, setSchedules] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleForSeat, setSelectedScheduleForSeat] = useState(null);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [activeTicketForView, setActiveTicketForView] = useState(null);
  const [profileForm, setProfileForm] = useState({ name:user?.name||'', email:user?.email||'', phone:user?.phone||'', city:user?.city||'', currentPassword:'', newPassword:'' });
  const [supportForm, setSupportForm] = useState({ issueType:'Booking Query', description:'' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schData, bkData] = await Promise.all([scheduleAPI.getAll(), bookingAPI.getMyBookings()]);
      setSchedules(schData || []);
      setMyBookings(bkData || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSearch = async (e) => {
    if(e) e.preventDefault();
    setLoading(true); setActiveTab('search');
    try {
      const res = await scheduleAPI.search({ from:searchParams.from, to:searchParams.to, date:searchParams.date });
      setSchedules(res || []);
      if(!res?.length) toast.info('No buses found for this route/date');
    } catch(e) { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const handleSeatSelected = (booking) => { setSelectedScheduleForSeat(null); setMyBookings(prev=>[booking,...prev]); setActiveBookingForPayment(booking); };
  const handlePaymentSuccess = (updatedBooking) => { setActiveBookingForPayment(null); setMyBookings(prev=>prev.map(b=>b._id===updatedBooking._id?updatedBooking:b)); setActiveTicketForView(updatedBooking); };
  const handleCancelBooking = async (id) => {
    if(!window.confirm('Cancel this booking?')) return;
    try { await bookingAPI.cancel(id); setMyBookings(prev=>prev.map(b=>b._id===id?{...b,status:'cancelled',paymentStatus:'refunded'}:b)); toast.success('Booking cancelled'); }
    catch(e) { toast.error('Cancel failed'); }
  };
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try { const u = await authAPI.updateProfile({ name:profileForm.name, phone:profileForm.phone, city:profileForm.city }); login({...user,...u}, localStorage.getItem('ethiobus_token')); toast.success('Profile updated!'); }
    catch(e) { toast.error('Update failed'); }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if(!profileForm.currentPassword||!profileForm.newPassword){ toast.error('Fill both password fields'); return; }
    try { await authAPI.changePassword({ currentPassword:profileForm.currentPassword, newPassword:profileForm.newPassword }); toast.success('Password changed!'); setProfileForm(p=>({...p,currentPassword:'',newPassword:''})); }
    catch(e) { toast.error(e.message||'Password change failed'); }
  };

  const activeBookings = myBookings.filter(b=>b.status==='confirmed'||b.status==='pending');
  const totalSpent = myBookings.reduce((s,b)=>b.paymentStatus==='completed'?s+b.totalPrice:s, 0);
  const upcomingTrip = activeBookings[0] || myBookings[0];

  const NavItem = ({tab, icon, label, badge}) => (
    <button className={`pd-nav-item ${activeTab===tab?'active':''}`} onClick={()=>setActiveTab(tab)}>
      {icon} {label} {badge>0 && <span className="pd-nav-badge">{badge}</span>}
    </button>
  );

  return (
    <div className="pd-wrap">
      {/* SIDEBAR */}
      <aside className="pd-sidebar">
        <div>
          <div className="pd-logo">
            <div className="pd-logo-icon"><FaBus /></div>
            <div className="pd-logo-text"><h2>ETHIO <span>BUS</span></h2><p>Smart Ticketing</p></div>
          </div>
          <nav className="pd-nav">
            <NavItem tab="dashboard"  icon={<FaBus />}        label="Dashboard" />
            <NavItem tab="search"     icon={<FaSearch />}     label="Search Buses" />
            <NavItem tab="schedules"  icon={<FaCalendarAlt />}label="Bus Schedules" />
            <NavItem tab="bookings"   icon={<FaTicketAlt />}  label="Booking History" badge={myBookings.length} />
            <NavItem tab="tickets"    icon={<FaQrcode />}     label="My Tickets" />
            <NavItem tab="payments"   icon={<FaWallet />}     label="Payments" />
            <NavItem tab="cancel"     icon={<FaExchangeAlt />}label="Cancel Booking" />
            <NavItem tab="profile"    icon={<FaUser />}       label="Profile" />
            <NavItem tab="support"    icon={<FaHeadset />}    label="Support" />
          </nav>
        </div>
        <div>
          <div className="pd-promo">
            <h4>Plan Your Next Trip</h4>
            <p>Book tickets easily across Ethiopia.</p>
            <button onClick={()=>setActiveTab('search')}>Search Buses →</button>
          </div>
          <button className="pd-logout" onClick={()=>{logout();navigate('/');}}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="pd-main">
        {/* TOPBAR */}
        <header className="pd-topbar">
          <div className="pd-topbar-search">
            <FaSearch style={{color:'#94a3b8'}}/>
            <input placeholder="Search buses, routes..." readOnly onClick={()=>setActiveTab('search')} />
          </div>
          <div className="pd-topbar-right">
            <button className="pd-icon-btn" onClick={()=>setActiveTab('support')}><FaBell /><span className="pd-badge">1</span></button>
            <div className="pd-user" onClick={()=>setActiveTab('profile')}>
              <div className="pd-avatar">{user?.name?.charAt(0)||'P'}</div>
              <div><strong>{user?.name?.split(' ')[0]||'Passenger'}</strong><span>Passenger</span></div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="pd-content">

          {/* ── DASHBOARD ── */}
          {activeTab==='dashboard' && (
            <div className="tab-fade">
              <div className="pd-welcome">
                <div>
                  <h2>Welcome back, {user?.name?.split(' ')[0]||'Passenger'}! 👋</h2>
                  <p>Book tickets, manage trips and explore Ethiopia with ease.</p>
                </div>
              </div>

              {/* Stats */}
              <div className="pd-stats">
                {[
                  {icon:<FaTicketAlt/>, label:'Total Bookings', val:myBookings.length, color:'#f3e8ff', ic:'#7c3aed', action:()=>setActiveTab('bookings')},
                  {icon:<FaCalendarAlt/>,label:'Upcoming Trips',  val:activeBookings.length, color:'#dcfce7', ic:'#16a34a', action:()=>setActiveTab('bookings')},
                  {icon:<FaWallet/>,    label:'Total Spent',     val:`ETB ${totalSpent.toLocaleString()}`, color:'#fef3c7', ic:'#d97706', action:()=>setActiveTab('payments')},
                  {icon:<FaQrcode/>,   label:'Confirmed Tickets',val:myBookings.filter(b=>b.paymentStatus==='completed').length, color:'#dbeafe', ic:'#1d4ed8', action:()=>setActiveTab('tickets')},
                ].map((s,i)=>(
                  <div key={i} className="pd-stat-card" onClick={s.action}>
                    <div className="pd-stat-icon" style={{background:s.color,color:s.ic}}>{s.icon}</div>
                    <div className="pd-stat-body">
                      <div className="pd-stat-val">{s.val}</div>
                      <div className="pd-stat-label">{s.label}</div>
                      <button className="pd-stat-link">View →</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search widget */}
              <div className="pd-search-banner">
                <h3>Search Your Bus</h3>
                <p>Find and book your favorite route</p>
                <form onSubmit={handleSearch} className="pd-search-form">
                  <div className="pd-search-field">
                    <label>From</label>
                    <select value={searchParams.from} onChange={e=>setSearchParams(p=>({...p,from:e.target.value}))}>
                      {CITIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="button" className="pd-swap" onClick={()=>setSearchParams(p=>({...p,from:p.to,to:p.from}))}><FaExchangeAlt/></button>
                  <div className="pd-search-field">
                    <label>To</label>
                    <select value={searchParams.to} onChange={e=>setSearchParams(p=>({...p,to:e.target.value}))}>
                      {CITIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="pd-search-field">
                    <label>Date</label>
                    <input type="date" value={searchParams.date} onChange={e=>setSearchParams(p=>({...p,date:e.target.value}))} />
                  </div>
                  <button type="submit" className="pd-search-btn"><FaSearch/> Search Buses</button>
                </form>
              </div>

              {/* Recent bookings + Upcoming */}
              <div className="pd-dash-grid">
                <div className="pd-card">
                  <div className="pd-card-head"><h4>Recent Bookings</h4><button onClick={()=>setActiveTab('bookings')}>View All</button></div>
                  {myBookings.length===0 ? (
                    <div className="pd-empty"><FaTicketAlt/><p>No bookings yet</p><button onClick={()=>setActiveTab('search')}>Search Buses</button></div>
                  ) : myBookings.slice(0,4).map(bk=>(
                    <div key={bk._id} className="pd-booking-row">
                      <div className="pd-booking-info">
                        <h5>{bk.schedule?.route?.from} → {bk.schedule?.route?.to}</h5>
                        <p>📅 {bk.schedule?.date} · Seat {Array.isArray(bk.selectedSeats)?bk.selectedSeats.join(', '):bk.selectedSeats}</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span className={`pd-badge-status ${bk.status}`}>{bk.status}</span>
                        <div className="pd-booking-price">ETB {bk.totalPrice}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  {upcomingTrip && (
                    <div className="pd-card pd-upcoming">
                      <div className="pd-card-head"><h4>Upcoming Trip</h4><button onClick={()=>setActiveTicketForView(upcomingTrip)}>View Ticket</button></div>
                      <h4>{upcomingTrip.schedule?.route?.from} → {upcomingTrip.schedule?.route?.to}</h4>
                      <p>📅 {upcomingTrip.schedule?.date} · {upcomingTrip.schedule?.departureTime}</p>
                      <p style={{color:'#078930',fontWeight:700}}>Seat: {Array.isArray(upcomingTrip.selectedSeats)?upcomingTrip.selectedSeats.join(', '):upcomingTrip.selectedSeats}</p>
                      <div className="pd-qr" onClick={()=>setActiveTicketForView(upcomingTrip)}>
                        <QRCodeSVG value={`ETHIOBUS:${upcomingTrip.ticketNumber||'BK001'}`} size={72}/>
                      </div>
                    </div>
                  )}
                  <div className="pd-card pd-quick-actions">
                    <h4>Quick Actions</h4>
                    <div className="pd-qa-grid">
                      {[
                        {icon:<FaSearch/>,label:'Search Buses',tab:'search',bg:'#f3e8ff',c:'#7c3aed'},
                        {icon:<FaCalendarAlt/>,label:'My Bookings',tab:'bookings',bg:'#dcfce7',c:'#16a34a'},
                        {icon:<FaUser/>,label:'Profile',tab:'profile',bg:'#fef3c7',c:'#d97706'},
                        {icon:<FaHeadset/>,label:'Support',tab:'support',bg:'#dbeafe',c:'#1d4ed8'},
                      ].map((a,i)=>(
                        <button key={i} className="pd-qa-btn" style={{'--qa-bg':a.bg,'--qa-c':a.c}} onClick={()=>setActiveTab(a.tab)}>
                          <span>{a.icon}</span>{a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SEARCH ── */}
          {activeTab==='search' && (
            <div className="tab-fade">
              <BusSearch onSelectSchedule={(sch) => setSelectedScheduleForSeat(sch)} />
            </div>
          )}

          {/* ── BUS SCHEDULES ── */}
          {activeTab==='schedules' && (
            <div className="tab-fade">
              <div className="pd-card">
                <div className="pd-card-head"><h4>All Bus Schedules</h4></div>
                {loading ? <div className="pd-loading"><span className="pd-spinner"/></div> :
                schedules.length === 0 ? (
                  <div className="pd-empty"><FaCalendarAlt/><p>No schedules available</p></div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {schedules.map(s=>(
                      <div key={s._id} className="pd-booking-row">
                        <div className="pd-booking-info">
                          <h5>{s.route?.from} → {s.route?.to}</h5>
                          <p>📅 {s.date} · 🕐 {s.departureTime} – {s.arrivalTime} · {s.availableSeats} seats left</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div className="pd-booking-price">ETB {s.price}</div>
                          <button className="pd-submit-btn" style={{padding:'4px 12px',fontSize:'.72rem',marginTop:4}} onClick={()=>setSelectedScheduleForSeat(s)}>Book Seat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BOOKINGS HISTORY ── */}
          {activeTab==='bookings' && (
            <div className="tab-fade">
              <BookingHistory />
            </div>
          )}

          {/* ── MY TICKETS ── */}
          {activeTab==='tickets' && (
            <div className="tab-fade">
              <TicketDownload />
            </div>
          )}

          {/* ── CANCEL BOOKING ── */}
          {activeTab==='cancel' && (
            <div className="tab-fade">
              <CancelBooking />
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {activeTab==='payments' && (
            <div className="tab-fade">
              <OnlinePayment booking={activeBookingForPayment} onSuccess={handlePaymentSuccess} />
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab==='profile' && (
            <div className="tab-fade">
              <PassengerProfile />
            </div>
          )}

          {/* ── SUPPORT ── */}
          {activeTab==='support' && (
            <div className="tab-fade pd-card" style={{maxWidth:560}}>
              <h3 style={{marginBottom:4}}>Customer Support</h3>
              <p style={{color:'#64748b',fontSize:'.82rem',marginBottom:16}}>Submit a support ticket and our team will respond shortly.</p>
              <form onSubmit={async e=>{
                e.preventDefault();
                try {
                  await supportAPI.create({ issueType: supportForm.issueType, description: supportForm.description, passengerName: user?.name || 'Passenger', passengerPhone: user?.phone || '' });
                  toast.success('Support ticket submitted!');
                  setSupportForm({issueType:'Booking Query',description:''});
                } catch(err) { toast.error('Failed to submit ticket'); }
              }} style={{display:'flex',flexDirection:'column',gap:12}}>
                <div className="pd-form-group">
                  <label>Issue Category</label>
                  <select value={supportForm.issueType} onChange={e=>setSupportForm(p=>({...p,issueType:e.target.value}))}>
                    <option>Booking Query</option><option>Payment &amp; Refund</option><option>Schedule Change</option><option>Other</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Describe Your Issue</label>
                  <textarea rows={4} value={supportForm.description} onChange={e=>setSupportForm(p=>({...p,description:e.target.value}))} placeholder="Explain your issue..." required style={{resize:'vertical'}}/>
                </div>
                <button type="submit" className="pd-submit-btn">Submit Ticket →</button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {selectedScheduleForSeat && <SeatSelectorModal schedule={selectedScheduleForSeat} onClose={()=>setSelectedScheduleForSeat(null)} onBookingComplete={handleSeatSelected}/>}
      {activeBookingForPayment && <PaymentModal booking={activeBookingForPayment} onClose={()=>setActiveBookingForPayment(null)} onSuccess={handlePaymentSuccess}/>}
      {activeTicketForView && <TicketModal booking={activeTicketForView} onClose={()=>setActiveTicketForView(null)}/>}
    </div>
  );
};

export default PassengerDashboard;
