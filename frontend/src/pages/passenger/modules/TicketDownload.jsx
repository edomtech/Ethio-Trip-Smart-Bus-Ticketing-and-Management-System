import { useState, useEffect } from 'react';
import { FaDownload, FaTicketAlt, FaBus, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaPrint } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const TicketDownload = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    bookingAPI.getMyBookings().then(res => {
      const paid = (res || []).filter(b => b.paymentStatus === 'completed' || b.status === 'confirmed');
      setBookings(paid);
      if (paid.length) setSelected(paid[0]);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load tickets'); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>Loading tickets...</div>;

  if (!bookings.length) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
      <FaTicketAlt style={{ fontSize:'3rem', opacity:0.3, marginBottom:16 }} />
      <p style={{ fontWeight:700 }}>No confirmed tickets yet</p>
      <p style={{ fontSize:'0.85rem' }}>Book and pay for a trip to get your e-ticket</p>
    </div>
  );

  const seat = selected ? (Array.isArray(selected.selectedSeats) ? selected.selectedSeats.join(', ') : selected.selectedSeats) : '';

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20 }}>

      {/* Left — ticket list */}
      <div>
        <h4 style={{ fontWeight:800, color:'#0f172a', marginBottom:12, fontSize:'0.88rem' }}>
          My Tickets ({bookings.length})
        </h4>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {bookings.map(bk => (
            <button key={bk._id} onClick={() => setSelected(bk)}
              style={{ padding:'10px 12px', borderRadius:10, border:`2px solid ${selected?._id===bk._id?'#059669':'#e2e8f0'}`, background:selected?._id===bk._id?'#f0fdf4':'#fff', textAlign:'left', cursor:'pointer', transition:'all .15s' }}>
              <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#0f172a', marginBottom:2 }}>
                {bk.schedule?.route?.from?.slice(0,3)} → {bk.schedule?.route?.to?.slice(0,3)}
              </div>
              <div style={{ fontSize:'0.7rem', color:'#64748b' }}>#{bk.ticketNumber}</div>
              <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:2 }}>{bk.schedule?.date}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — boarding pass */}
      {selected && (
        <div>
          {/* Ticket card */}
          <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.10)', border:'1px solid #e2e8f0', maxWidth:560 }}>

            {/* Top green header */}
            <div style={{ background:'linear-gradient(135deg,#059669,#047857)', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.65)', fontWeight:700, letterSpacing:1, marginBottom:3 }}>ETHIO BUS · E-TICKET</div>
                <div style={{ fontSize:'1.35rem', fontWeight:900, color:'#fff', letterSpacing:1 }}>
                  {selected.schedule?.route?.from?.toUpperCase().slice(0,3)}
                  <span style={{ margin:'0 10px', opacity:.6, fontWeight:400 }}>→</span>
                  {selected.schedule?.route?.to?.toUpperCase().slice(0,3)}
                </div>
                <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,.75)', marginTop:2 }}>
                  {selected.schedule?.route?.from} → {selected.schedule?.route?.to}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,.55)', marginBottom:2 }}>TICKET NO</div>
                <div style={{ fontSize:'0.82rem', fontWeight:800, color:'#fff', fontFamily:'monospace' }}>#{selected.ticketNumber}</div>
                <div style={{ marginTop:6, background:'rgba(255,255,255,.15)', padding:'2px 10px', borderRadius:50, display:'inline-block', fontSize:'0.65rem', fontWeight:700, color:'#fff' }}>
                  CONFIRMED ✓
                </div>
              </div>
            </div>

            {/* Notch divider */}
            <div style={{ display:'flex', alignItems:'center', margin:'0 -1px', position:'relative', height:20 }}>
              <div style={{ flex:1, borderTop:'2px dashed #e2e8f0', margin:'0 16px' }} />
              <div style={{ width:20, height:20, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', flexShrink:0 }} />
              <div style={{ flex:1, borderTop:'2px dashed #e2e8f0', margin:'0 16px' }} />
            </div>

            {/* Body — info grid */}
            <div style={{ padding:'14px 24px 18px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'14px 20px', marginBottom:16 }}>
                {[
                  { icon:<FaUser/>,         label:'PASSENGER',  val: user?.name || selected.passenger?.name || 'Passenger' },
                  { icon:<FaCalendarAlt/>,  label:'DATE',       val: selected.schedule?.date || '—' },
                  { icon:<FaBus/>,          label:'DEPARTURE',  val: selected.schedule?.departureTime || '—' },
                  { icon:<FaMapMarkerAlt/>, label:'SEAT',       val: seat || '—' },
                  { icon:<FaBus/>,          label:'BUS',        val: selected.schedule?.bus?.busNumber || '—' },
                  { icon:<FaTicketAlt/>,    label:'FARE',       val: `ETB ${selected.totalPrice}` },
                ].map(d => (
                  <div key={d.label}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.6rem', color:'#94a3b8', fontWeight:700, letterSpacing:.5, marginBottom:3 }}>
                      <span style={{ color:'#059669' }}>{d.icon}</span> {d.label}
                    </div>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#0f172a' }}>{d.val}</div>
                  </div>
                ))}
              </div>

              {/* QR + instruction row */}
              <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 14px', background:'#f0fdf4', borderRadius:10, border:'1px solid #d1fae5' }}>
                <div style={{ background:'#fff', padding:8, borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,.06)', flexShrink:0 }}>
                  <QRCodeSVG value={`ETHIOBUS:${selected.ticketNumber}:${seat}`} size={80} level="M" />
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'0.8rem', color:'#064e3b', marginBottom:3 }}>Scan to board</div>
                  <div style={{ fontSize:'0.7rem', color:'#065f46', lineHeight:1.5 }}>
                    Show this QR code to the gate agent at the terminal.<br/>
                    Arrive 30 minutes before departure.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ background:'#f8fafc', borderTop:'1px solid #e2e8f0', padding:'10px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>EthioBus Smart Ticketing System</div>
              <div style={{ display:'flex', gap:3 }}>
                <span style={{ width:10, height:4, borderRadius:2, background:'#059669', display:'inline-block' }}/>
                <span style={{ width:10, height:4, borderRadius:2, background:'#fbbf24', display:'inline-block' }}/>
                <span style={{ width:10, height:4, borderRadius:2, background:'#ef4444', display:'inline-block' }}/>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:10, marginTop:14, maxWidth:560 }}>
            <button onClick={() => { toast.success('Ticket downloaded!'); window.print(); }}
              style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#059669,#047857)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <FaDownload /> Download PDF
            </button>
            <button onClick={() => window.print()}
              style={{ padding:'11px 18px', background:'#f8fafc', color:'#334155', border:'1.5px solid #e2e8f0', borderRadius:10, fontWeight:600, fontSize:'0.82rem', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <FaPrint /> Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDownload;
