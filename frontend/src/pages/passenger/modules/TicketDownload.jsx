import { useState, useEffect } from 'react';
import { FaDownload, FaTicketAlt, FaBus, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaPrint, FaTrash } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const convertSvgToPng = (svgEl) => {
  return new Promise((resolve) => {
    try {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = 'data:image/svg+xml;base64,' + svg64;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 0, 0, 300, 300);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = image64;
    } catch {
      resolve(null);
    }
  });
};

const isConfirmedOrPaid = (b) => {
  if (!b) return false;
  const st = (b.status || '').toLowerCase();
  const ps = (b.paymentStatus || '').toLowerCase();
  if (st === 'cancelled') return false;
  const hasPaidStatus = ps === 'paid' || ps === 'completed';
  const hasConfirmedStatus = st === 'confirmed' || st === 'completed';
  const hasTicketNumber = Boolean(b.ticketNumber) || (Array.isArray(b.tickets) && b.tickets.length > 0);
  return hasPaidStatus || hasConfirmedStatus || hasTicketNumber;
};

const normalizeTicketBooking = (bk) => {
  if (!bk) return bk;
  const ticketNumber =
    bk.ticketNumber ||
    (Array.isArray(bk.tickets) && bk.tickets[0]?.ticketNumber) ||
    `ETH-${String(bk._id || Date.now()).slice(-6).toUpperCase()}`;
  return { ...bk, ticketNumber };
};

const TicketDownload = ({ bookings: initialBookings = null, onViewTicket = null, onBookNow = null, onViewHistory = null }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeLeg, setActiveLeg] = useState('outbound'); // 'outbound' | 'return'

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      // 1. If initialBookings provided and non-empty, use immediately
      if (initialBookings && Array.isArray(initialBookings) && initialBookings.length > 0) {
        const paid = initialBookings.filter(isConfirmedOrPaid).map(normalizeTicketBooking);
        if (isMounted) {
          setBookings(paid);
          if (paid.length > 0) setSelected(prev => prev || paid[0]);
          setLoading(false);
        }
      }

      // 2. Fetch fresh bookings from API
      try {
        const res = await bookingAPI.getMyBookings();
        const list = Array.isArray(res) ? res : (res?.bookings || res?.data || []);
        if (isMounted) {
          const paid = (list || []).filter(isConfirmedOrPaid).map(normalizeTicketBooking);
          setBookings(paid);
          if (paid.length > 0) {
            setSelected(prev => {
              if (prev && paid.some(p => p._id === prev._id)) return prev;
              return paid[0];
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch bookings in TicketDownload:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTickets();
    return () => { isMounted = false; };
  }, [initialBookings]);

  const handleDeleteTicket = (id, tktNo) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${tktNo || ''} from your history?`)) return;
    setBookings(prev => {
      const updated = prev.filter(b => b._id !== id);
      if (selected?._id === id) setSelected(updated[0] || null);
      return updated;
    });
    toast.success(`Ticket ${tktNo || ''} removed from view`);
  };

  if (loading) {
    return (
      <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#078930', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Loading your E-Tickets...</p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '48px 24px',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
        maxWidth: '560px',
        margin: '20px auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#f0fdf4',
          color: '#078930',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          margin: '0 auto 16px',
          border: '1px solid #bbf7d0'
        }}>
          <FaTicketAlt />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
          No Confirmed E-Tickets Yet
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 24px', lineHeight: 1.5 }}>
          Your digital E-Tickets and scannable QR verification codes appear here automatically once you book and pay for your trip.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {onBookNow && (
            <button
              type="button"
              onClick={onBookNow}
              style={{
                padding: '10px 20px',
                background: '#078930',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(7,137,48,0.25)'
              }}
            >
              <FaBus /> Book a Bus Ticket
            </button>
          )}
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              style={{
                padding: '10px 18px',
                background: '#f8fafc',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              View Booking History
            </button>
          )}
        </div>
      </div>
    );
  }

  const isRoundTrip =
    selected?.tripType === 'round' ||
    !!selected?.returnLeg?.schedule ||
    (Array.isArray(selected?.tickets) && selected.tickets.some(t => t.legType === 'return'));

  const isOutbound = !isRoundTrip || activeLeg === 'outbound';
  const legData = isOutbound ? (selected?.outboundLeg || {}) : (selected?.returnLeg || {});
  const schedule = legData.schedule || (isOutbound ? selected?.schedule : null) || {};

  const outboundFrom =
    selected?.outboundLeg?.route?.from ||
    selected?.schedule?.route?.from ||
    selected?.from ||
    'Addis Ababa';

  const outboundTo =
    selected?.outboundLeg?.route?.to ||
    selected?.schedule?.route?.to ||
    selected?.to ||
    'Destination';

  const returnFrom =
    selected?.returnLeg?.route?.from ||
    selected?.returnLeg?.schedule?.route?.from ||
    outboundTo;

  const returnTo =
    selected?.returnLeg?.route?.to ||
    selected?.returnLeg?.schedule?.route?.to ||
    outboundFrom;

  const routeFrom = isOutbound
    ? (schedule?.route?.from || selected?.outboundLeg?.route?.from || outboundFrom)
    : (schedule?.route?.from || selected?.returnLeg?.route?.from || returnFrom);

  const routeTo = isOutbound
    ? (schedule?.route?.to || selected?.outboundLeg?.route?.to || outboundTo)
    : (schedule?.route?.to || selected?.returnLeg?.route?.to || returnTo);

  const busNumber = schedule?.bus?.busNumber || legData.bus?.busNumber || 'B001';
  const busType   = schedule?.bus?.type || legData.bus?.type || 'Luxury Coach';
  const depTime   = schedule?.departureTime || legData.departureTime || (isOutbound ? '06:00 AM' : '02:00 PM');
  const arrTime   = schedule?.arrivalTime || (isOutbound ? '01:00 PM' : '08:00 PM');
  const depDate   = schedule?.date || legData.date || (isOutbound ? selected?.schedule?.date : null) || new Date().toISOString().split('T')[0];

  const operatorName =
    schedule?.companyId?.companyName ||
    legData?.schedule?.companyId?.companyName ||
    selected?.companyId?.companyName ||
    selected?.company?.companyName ||
    selected?.busCompany ||
    'Ethio Trip Express';

  const legSeats = legData.seats || (isOutbound ? selected?.selectedSeats : null) || ['1'];
  const seat = Array.isArray(legSeats) ? legSeats.join(', ') : legSeats;

  const outboundTicketNo = selected?.outboundTicketNumber || (selected?.ticketNumber && !selected?.ticketNumber.endsWith('-RET') ? selected?.ticketNumber : (selected?.ticketNumber || 'ETH-685335-89'));
  const returnTicketNo = selected?.returnTicketNumber || (outboundTicketNo.includes('-RET') ? outboundTicketNo : `${outboundTicketNo}-RET`);
  const currentTicketNo = isOutbound ? outboundTicketNo : returnTicketNo;

  const totalPrice = selected?.totalPrice || selected?.baseFare || 700;
  const outboundPrice = selected?.outboundLeg?.price || (isRoundTrip ? Math.round(totalPrice / 2) : totalPrice);
  const returnPrice = selected?.returnLeg?.price || Math.round(totalPrice / 2);
  const currentPrice = isOutbound ? outboundPrice : returnPrice;

  // Format date with day of week (e.g. 2026-08-09 (Saturday))
  const formattedDate = (() => {
    try {
      const d = new Date(depDate);
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${depDate} (${days[d.getDay()]})`;
      }
    } catch {
      // fallback
    }
    return depDate;
  })();

  const paymentStatus = selected?.paymentStatus || 'PAID';
  const passengerName =
    selected?.passenger?.name ||
    selected?.passengerName ||
    (typeof selected?.passenger === 'string' ? selected.passenger : null) ||
    user?.name ||
    'Passenger';

  // Real scan-identifiable QR verification string
  const qrVerificationData = [
    `TICKET: ${currentTicketNo}`,
    `LEG: ${isOutbound ? 'OUTBOUND' : 'RETURN'}`,
    `PASSENGER: ${passengerName}`,
    `OPERATOR: ${operatorName}`,
    `ROUTE: ${routeFrom} -> ${routeTo}`,
    `BUS: ${busType} (${busNumber})`,
    `SEAT: ${seat}`,
    `DATE: ${formattedDate}`,
    `TIME: ${depTime}`,
    `FARE: ${currentPrice} ETB`,
    `STATUS: ${(paymentStatus || 'PAID').toString().toUpperCase()}`,
    `VERIFY: https://ethiotrip.com/verify?ticket=${currentTicketNo}`
  ].join('\n');

  const renderTicketPage = async (doc, ticketData) => {
    // Top Red & Yellow Stripe
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 90, 3, 'F');
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 3, 90, 1.5, 'F');

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('E-TICKET', 45, 13, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Thank you for choosing ${ticketData.operator}!`, 45, 18, { align: 'center' });

    const fields = [
      ['Ticket No', ticketData.ticketNo],
      ['Journey Leg', ticketData.legLabel],
      ['Passenger Name', ticketData.passengerName],
      ['Bus Company', ticketData.operator],
      ['Bus', ticketData.bus],
      ['Bus Number', ticketData.busNumber],
      ['Route', `${ticketData.from} -> ${ticketData.to}`],
      ['Date', ticketData.date],
      ['Departure Time', ticketData.time],
      ['Seat No', ticketData.seat],
      ['Price', `${ticketData.price} ETB`],
      ['Payment Status', ticketData.status.toUpperCase()],
    ];

    let y = 25;
    fields.forEach(([lbl, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(lbl, 8, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), 82, y, { align: 'right' });
      y += 7;
    });

    // Capture QR Code SVG as PNG image
    let qrDataUrl = null;
    const svgEl = document.querySelector(`#qr-dl-svg-${ticketData.ticketNo}`) || document.querySelector('.ticket-download-qr svg');
    if (svgEl) {
      qrDataUrl = await convertSvgToPng(svgEl);
    }

    // Bottom QR Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(18, y + 2, 54, 44, 3, 3, 'F');

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 32, y + 5, 26, 26);
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Scan to Verify Ticket', 45, y + 38, { align: 'center' });

    // Dark Green Footer
    doc.setFillColor(6, 47, 34);
    doc.rect(0, 198, 90, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text('Safe Journey!', 8, 205);
    doc.text('www.ethiotrip.com', 82, 205, { align: 'right' });
  };

  // PDF Ticket Generation
  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [90, 210] });

      const outboundData = {
        ticketNo: outboundTicketNo,
        legLabel: 'Outbound Trip',
        passengerName,
        operator: operatorName,
        bus: busType,
        busNumber,
        from: outboundFrom,
        to: outboundTo,
        date: depDate,
        time: depTime,
        seat,
        price: outboundPrice,
        status: (paymentStatus || 'PAID').toString(),
      };

      if (isRoundTrip) {
        await renderTicketPage(doc, outboundData);
        doc.addPage([90, 210]);
        const returnData = {
          ticketNo: returnTicketNo,
          legLabel: 'Return Trip',
          passengerName,
          operator: legData?.schedule?.companyId?.companyName || operatorName,
          bus: legData?.bus?.type || 'Luxury Coach',
          busNumber: legData?.bus?.busNumber || 'B002',
          from: returnFrom,
          to: returnTo,
          date: legData.date || depDate,
          time: legData.departureTime || '02:00 PM',
          seat: Array.isArray(legData.seats) ? legData.seats.join(', ') : seat,
          price: returnPrice,
          status: (paymentStatus || 'PAID').toString(),
        };
        await renderTicketPage(doc, returnData);
        doc.save(`ETickets_${selected?.ticketNumber || currentTicketNo}_RoundTrip.pdf`);
        toast.success('Both Outbound & Return E-Tickets downloaded successfully!');
      } else {
        await renderTicketPage(doc, outboundData);
        doc.save(`ETicket_${currentTicketNo}.pdf`);
        toast.success('E-Ticket PDF downloaded with QR Code!');
      }
    } catch (err) {
      console.error('PDF generation error, falling back to print:', err);
      window.print();
    }
  };

  const ticketRows = [
    { label: 'Ticket No', value: currentTicketNo },
    { label: 'Passenger Name', value: passengerName },
    { label: 'Bus Company', value: operatorName },
    { label: 'Bus', value: busType },
    { label: 'Bus Number', value: busNumber },
    { label: 'Route', value: `${routeFrom} -> ${routeTo}` },
    { label: 'Date', value: formattedDate },
    { label: 'Departure Time', value: depTime },
    { label: 'Arrival Time', value: arrTime },
    { label: 'Seat No', value: seat },
    { label: 'Price', value: `${totalPrice} ETB` },
    { label: 'Payment Status', value: (paymentStatus || 'PAID').toString().toUpperCase() },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24, alignItems: 'flex-start' }}>

      {/* Left — ticket selector list with Delete button */}
      <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h4 style={{ fontWeight:800, color:'#0f172a', margin: '0 0 12px', fontSize:'0.9rem' }}>
          My Confirmed Tickets ({bookings.length})
        </h4>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {bookings.map(bk => {
            const isSelected = selected?._id === bk._id;
            return (
              <div key={bk._id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => { setSelected(bk); setActiveLeg('outbound'); }}
                  style={{
                    flex: 1, padding:'12px 14px', borderRadius:10,
                    border: `2px solid ${isSelected ? '#078930' : '#e2e8f0'}`,
                    background: isSelected ? '#f0fdf4' : '#fff',
                    textAlign:'left', cursor:'pointer', transition:'all .15s'
                  }}
                >
                  <div style={{ fontWeight:800, fontSize:'0.85rem', color:'#0f172a', marginBottom:2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{bk.schedule?.route?.from || 'Origin'} ➔ {bk.schedule?.route?.to || 'Destination'}</span>
                    {bk.tripType === 'round' && <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 800 }}>🔁 Round</span>}
                  </div>
                  <div style={{ fontSize:'0.74rem', color:'#078930', fontWeight: 700, fontFamily: 'monospace' }}>{bk.ticketNumber}</div>
                  <div style={{ fontSize:'0.7rem', color:'#64748b', marginTop:2 }}>
                    {bk.schedule?.date} · {bk.companyId?.companyName || 'Ethio Trip'}
                  </div>
                </button>
                <button
                  type="button"
                  title="Delete ticket from history"
                  onClick={() => handleDeleteTicket(bk._id, bk.ticketNumber)}
                  style={{
                    padding: '12px 10px', borderRadius: 10,
                    border: '1.5px solid #fecaca', background: '#fef2f2',
                    color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — exact matching E-Ticket card */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            background:'#fff', borderRadius:16, overflow:'hidden',
            boxShadow:'0 10px 30px rgba(0,0,0,.12)', border:'1px solid #e2e8f0',
            width: '100%', maxWidth: 420
          }}>

            {/* Top Red & Yellow Accent Stripe */}
            <div style={{ height: 5, background: '#dc2626', width: '100%' }} />
            <div style={{ height: 2.5, background: '#eab308', width: '100%' }} />

            {/* Round trip tab switcher */}
            {isRoundTrip && (
              <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setActiveLeg('outbound')}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none',
                    borderBottom: activeLeg === 'outbound' ? '3px solid #078930' : 'none',
                    background: activeLeg === 'outbound' ? '#ffffff' : 'transparent',
                    fontWeight: 800, color: activeLeg === 'outbound' ? '#078930' : '#64748b',
                    fontSize: '0.78rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                  }}
                >
                  <FaTicketAlt /> Outbound Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeg('return')}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none',
                    borderBottom: activeLeg === 'return' ? '3px solid #d97706' : 'none',
                    background: activeLeg === 'return' ? '#ffffff' : 'transparent',
                    fontWeight: 800, color: activeLeg === 'return' ? '#d97706' : '#64748b',
                    fontSize: '0.78rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                  }}
                >
                  <FaTicketAlt /> Return Ticket
                </button>
              </div>
            )}

            {/* Ticket Body */}
            <div style={{ padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Title Header */}
              <div style={{ textAlign: 'center', marginBottom: 6 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                  E-TICKET
                </h1>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Thank you for choosing {operatorName}!
                </p>
              </div>

              {/* Key-Value Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                {ticketRows.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.84rem'
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                    <span style={{
                      color: '#0f172a',
                      fontWeight: 800,
                      textAlign: 'right',
                      fontFamily: row.label === 'Ticket No' ? 'monospace' : 'inherit'
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* QR Code Container */}
              <div className="ticket-download-qr" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 6,
                padding: '16px',
                background: '#f8fafc',
                borderRadius: 14,
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  background: '#ffffff',
                  padding: 10,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QRCodeSVG
                    id={`qr-dl-svg-${currentTicketNo}`}
                    value={qrVerificationData}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: 8 }}>
                  Scan to Verify Ticket
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  style={{
                    flex: 1, padding: '10px',
                    background: '#078930',
                    color: '#ffffff', border: 'none', borderRadius: 8,
                    fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(7,137,48,0.25)'
                  }}
                >
                  <FaDownload /> {isRoundTrip ? 'Download Both Tickets (PDF)' : 'Download E-Ticket'}
                </button>
                {onViewTicket && (
                  <button
                    type="button"
                    onClick={() => onViewTicket(selected)}
                    style={{
                      padding: '10px 14px',
                      background: '#ecfdf5',
                      color: '#078930', border: '1.5px solid #a7f3d0', borderRadius: 8,
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                    title="Open full E-Ticket modal"
                  >
                    <FaTicketAlt /> Full View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 16px',
                    background: '#ffffff',
                    color: '#334155', border: '1.5px solid #cbd5e1', borderRadius: 8,
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                  }}
                >
                  <FaPrint /> Print
                </button>
              </div>
            </div>

            {/* Dark Green Footer Bar */}
            <div style={{
              background: '#062f22',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
              fontSize: '0.78rem'
            }}>
              <span style={{ fontWeight: 800 }}>Safe Journey!</span>
              <span style={{ opacity: 0.85, fontSize: '0.74rem' }}>www.ethiotrip.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDownload;
