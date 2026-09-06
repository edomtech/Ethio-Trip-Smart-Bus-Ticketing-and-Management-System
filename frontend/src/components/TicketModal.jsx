import React, { useState } from 'react';
import { FaTimes, FaDownload, FaPrint, FaTicketAlt } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
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

const TicketModal = ({ booking, onClose }) => {
  const [activeLeg, setActiveLeg] = useState('outbound'); // 'outbound' | 'return'

  if (!booking) return null;

  const isPaidOrConfirmed =
    booking.status === 'confirmed' ||
    booking.status === 'CONFIRMED' ||
    booking.status === 'completed' ||
    booking.status === 'COMPLETED' ||
    booking.paymentStatus === 'paid' ||
    booking.paymentStatus === 'PAID';

  if (!isPaidOrConfirmed) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 14px' }}>
            <FaTicketAlt />
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 900 }}>Payment Required</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 20px', lineHeight: 1.5 }}>
            This reservation is pending payment. Official E-Tickets and Ticket IDs are only issued after payment is completed.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#078930',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Understood
          </button>
        </div>
      </div>
    );
  }

  const isRoundTrip =
    booking.tripType === 'round' ||
    !!booking.returnLeg?.schedule ||
    (Array.isArray(booking.tickets) && booking.tickets.some(t => t.legType === 'return'));

  const {
    ticketNumber = 'ETH-CONFIRMED',
    totalPrice = 700,
    paymentStatus = 'PAID',
  } = booking;

  const resolvedPassengerName =
    booking.passenger?.name ||
    booking.passengerName ||
    (typeof booking.passenger === 'string' ? booking.passenger : null) ||
    booking.passengerDetails?.name ||
    booking.user?.name ||
    'Passenger';

  // Active leg info
  const isOutbound = !isRoundTrip || activeLeg === 'outbound';
  const legData = isOutbound ? (booking.outboundLeg || {}) : (booking.returnLeg || {});
  const schedule = legData.schedule || (isOutbound ? booking.schedule : null) || {};

  const outboundFrom =
    booking.outboundLeg?.route?.from ||
    booking.schedule?.route?.from ||
    booking.outboundLeg?.schedule?.route?.from ||
    booking.from ||
    'Addis Ababa';

  const outboundTo =
    booking.outboundLeg?.route?.to ||
    booking.schedule?.route?.to ||
    booking.outboundLeg?.schedule?.route?.to ||
    booking.to ||
    'Destination';

  const returnFrom =
    booking.returnLeg?.route?.from ||
    booking.returnLeg?.schedule?.route?.from ||
    outboundTo;

  const returnTo =
    booking.returnLeg?.route?.to ||
    booking.returnLeg?.schedule?.route?.to ||
    outboundFrom;

  const routeFrom = isOutbound
    ? (schedule?.route?.from || legData.route?.from || outboundFrom)
    : (schedule?.route?.from || legData.route?.from || returnFrom);

  const routeTo = isOutbound
    ? (schedule?.route?.to || legData.route?.to || outboundTo)
    : (schedule?.route?.to || legData.route?.to || returnTo);

  const busType = schedule?.bus?.type || legData.bus?.type || 'Luxury Coach';
  const busNumber = schedule?.bus?.busNumber || legData.bus?.busNumber || 'B001';
  const depTime = schedule?.departureTime || legData.departureTime || (isOutbound ? '06:00 AM' : '02:00 PM');
  const arrTime = schedule?.arrivalTime || (isOutbound ? '01:00 PM' : '08:00 PM');
  const rawDate = schedule?.date || legData.date || booking.schedule?.date || booking.date || booking.travelDate;
  const depDate = rawDate || new Date().toISOString().split('T')[0];

  const operatorName =
    schedule?.companyId?.companyName ||
    legData?.schedule?.companyId?.companyName ||
    booking.companyId?.companyName ||
    booking.company?.companyName ||
    booking.busCompany ||
    booking.companyName ||
    'Ethio Trip Express';

  const legSeats = legData.seats || (isOutbound ? booking.selectedSeats : null) || ['1'];
  const seats = Array.isArray(legSeats) ? legSeats.join(', ') : legSeats;

  const outboundTicketNo = booking.outboundTicketNumber || (booking.ticketNumber && !booking.ticketNumber.endsWith('-RET') ? booking.ticketNumber : ticketNumber);
  const returnTicketNo = booking.returnTicketNumber || (outboundTicketNo.includes('-RET') ? outboundTicketNo : `${outboundTicketNo}-RET`);
  const currentTicketNo = isOutbound ? outboundTicketNo : returnTicketNo;

  const outboundPrice = booking.outboundLeg?.price || (isRoundTrip ? Math.round(totalPrice / 2) : totalPrice);
  const returnPrice = booking.returnLeg?.price || Math.round(totalPrice / 2);
  const currentPrice = isOutbound ? outboundPrice : returnPrice;

  // Format date with day of week (e.g. 2026-08-09 (Saturday))
  const formattedDate = (() => {
    try {
      if (!depDate) return 'Upcoming';
      const d = new Date(depDate);
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${depDate} (${days[d.getDay()]})`;
      }
    } catch {
      // fallback
    }
    return depDate || 'Upcoming';
  })();

  // Verifiable QR Code payload string
  const qrVerificationData = [
    `TICKET: ${currentTicketNo}`,
    `LEG: ${isOutbound ? 'OUTBOUND' : 'RETURN'}`,
    `PASSENGER: ${resolvedPassengerName}`,
    `OPERATOR: ${operatorName}`,
    `ROUTE: ${routeFrom} -> ${routeTo}`,
    `BUS: ${busType} (${busNumber})`,
    `SEAT: ${seats}`,
    `DATE: ${formattedDate}`,
    `TIME: ${depTime}`,
    `FARE: ${currentPrice} ETB`,
    `STATUS: ${(paymentStatus || 'PAID').toString().toUpperCase()}`,
    `VERIFY: https://ethiotrip.com/verify?ticket=${currentTicketNo}`
  ].join('\n');

  // Helper to render one ticket onto a jsPDF doc
  const renderTicketPage = async (doc, ticketData) => {
    // Top Red & Yellow Bar
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

    // Ticket Data Table
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

    // Capture QR code SVG element and convert to PNG data URL
    let qrDataUrl = null;
    const svgEl = document.querySelector(`#qr-svg-${ticketData.ticketNo}`) || document.querySelector('.ticket-qr-box svg');
    if (svgEl) {
      qrDataUrl = await convertSvgToPng(svgEl);
    }

    // Draw QR Container Box
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
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Safe Journey!', 8, 205);
    doc.setFont('helvetica', 'normal');
    doc.text('www.ethiotrip.com', 82, 205, { align: 'right' });
  };

  // PDF Ticket Generation
  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [90, 210] });

      // Outbound ticket data
      const outboundData = {
        ticketNo: outboundTicketNo,
        legLabel: 'Outbound Trip',
        passengerName: resolvedPassengerName,
        operator: operatorName,
        bus: schedule?.bus?.type || 'Luxury Coach',
        busNumber: schedule?.bus?.busNumber || 'B001',
        from: outboundFrom,
        to: outboundTo,
        date: booking.outboundLeg?.date || booking.schedule?.date || depDate,
        time: booking.outboundLeg?.departureTime || booking.schedule?.departureTime || depTime,
        seat: Array.isArray(booking.outboundLeg?.seats || booking.selectedSeats) ? (booking.outboundLeg?.seats || booking.selectedSeats).join(', ') : seats,
        price: outboundPrice,
        status: paymentStatus,
      };

      if (isRoundTrip) {
        // Render Outbound on Page 1
        await renderTicketPage(doc, outboundData);

        // Render Return on Page 2
        doc.addPage([90, 210]);
        const returnData = {
          ticketNo: returnTicketNo,
          legLabel: 'Return Trip',
          passengerName: resolvedPassengerName,
          operator: booking.returnLeg?.schedule?.companyId?.companyName || operatorName,
          bus: booking.returnLeg?.schedule?.bus?.type || 'Luxury Coach',
          busNumber: booking.returnLeg?.schedule?.bus?.busNumber || 'B002',
          from: returnFrom,
          to: returnTo,
          date: booking.returnLeg?.date || booking.returnLeg?.schedule?.date || depDate,
          time: booking.returnLeg?.departureTime || booking.returnLeg?.schedule?.departureTime || '02:00 PM',
          seat: Array.isArray(booking.returnLeg?.seats) ? booking.returnLeg.seats.join(', ') : seats,
          price: returnPrice,
          status: paymentStatus,
        };
        await renderTicketPage(doc, returnData);
        doc.save(`ETickets_${booking.ticketNumber || currentTicketNo}_RoundTrip.pdf`);
        toast.success('Both Outbound & Return E-Tickets downloaded successfully!');
      } else {
        await renderTicketPage(doc, outboundData);
        doc.save(`ETicket_${currentTicketNo}.pdf`);
        toast.success('E-Ticket PDF downloaded with QR Code!');
      }
    } catch (err) {
      window.print();
    }
  };

  const ticketRows = [
    { label: 'Ticket No', value: currentTicketNo },
    { label: 'Journey Leg', value: isRoundTrip ? (isOutbound ? 'Outbound Trip' : 'Return Trip') : 'One-Way Trip' },
    { label: 'Passenger Name', value: resolvedPassengerName },
    { label: 'Bus Company', value: operatorName },
    { label: 'Bus Type', value: busType },
    { label: 'Bus Number', value: busNumber },
    { label: 'Route', value: `${routeFrom} -> ${routeTo}` },
    { label: 'Date', value: formattedDate },
    { label: 'Departure Time', value: depTime },
    { label: 'Arrival Time', value: arrTime },
    { label: 'Seat No', value: seats },
    { label: 'Leg Fare', value: `${currentPrice} ETB` },
    { label: 'Total Booking Fare', value: `${totalPrice} ETB` },
    { label: 'Payment Status', value: (paymentStatus || 'PAID').toString().toUpperCase() },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          maxHeight: '94vh',
        }}
      >
        {/* ── Top Red & Yellow Accent Stripe ── */}
        <div style={{ height: 5, background: '#dc2626', width: '100%' }} />
        <div style={{ height: 2.5, background: '#eab308', width: '100%' }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          title="Close"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: '#f1f5f9', border: 'none',
            width: 28, height: 28, borderRadius: '50%',
            color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', zIndex: 10
          }}
        >
          <FaTimes />
        </button>

        {/* ── Round-Trip Switcher (if round-trip) ── */}
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

        {/* ── Scrollable Ticket Body ── */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Title Header */}
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
              E-TICKET
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Thank you for choosing {operatorName}!
            </p>
          </div>

          {/* Key-Value Rows (Exact match with reference image) */}
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

          {/* ── Real QR Code Container ── */}
          <div className="ticket-qr-box" style={{
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
                id={`qr-svg-${currentTicketNo}`}
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

          {/* ── Action Buttons (Download & Print) ── */}
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

        {/* ── Dark Green Bottom Footer Bar ── */}
        <div style={{
          background: '#062f22',
          padding: '12px 20px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          fontSize: '0.78rem',
          flexShrink: 0
        }}>
          <span style={{ fontWeight: 800 }}>Safe Journey!</span>
          <span style={{ opacity: 0.85, fontSize: '0.74rem' }}>www.ethiotrip.com</span>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
