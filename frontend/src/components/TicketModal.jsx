import React from 'react';
import { FaTimes, FaDownload, FaPrint, FaBus, FaCheckCircle, FaTicketAlt, FaUser, FaRoute, FaCalendarAlt, FaClock, FaChair, FaTag, FaShieldAlt } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';

const TicketModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const {
    ticketNumber = 'ETB-2026-000125',
    passenger = { name: 'Edu Taweke', phone: '0911000000', email: 'passenger@example.com' },
    schedule = {},
    selectedSeats = ['B2'],
    totalPrice = 750,
    status = 'confirmed',
  } = booking;

  const routeFrom = schedule.route?.from || 'Addis Ababa';
  const routeTo   = schedule.route?.to   || 'Bahir Dar';
  const busType   = schedule.bus?.type   || 'ETHIO BUS';
  const busNumber = schedule.bus?.busNumber || 'ETB 1010';
  const depTime   = schedule.departureTime || '07:30 AM';
  const arrTime   = schedule.arrivalTime   || '03:30 PM';
  const depDate   = schedule.date          || '15 Aug 2026';
  const dayName   = (() => {
    try {
      const d = new Date(depDate);
      return isNaN(d) ? 'Saturday' : d.toLocaleDateString('en-US', { weekday: 'long' });
    } catch { return 'Saturday'; }
  })();
  const seats = Array.isArray(selectedSeats) ? selectedSeats.join(', ') : selectedSeats;

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [85, 200] });

      // Header dark green background
      doc.setFillColor(6, 43, 30);
      doc.rect(0, 0, 85, 38, 'F');

      // Tri-color ribbon
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 38, 85, 3, 'F');
      doc.setFillColor(250, 204, 21);
      doc.rect(0, 41, 85, 3, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 44, 85, 3, 'F');

      // Logo text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ETHIO BUS', 42, 16, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Smart Bus Ticketing System', 42, 23, { align: 'center' });

      // E-TICKET title
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('E-TICKET', 42, 58, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Thank you for choosing Ethio Bus!', 42, 64, { align: 'center' });

      // Details
      const rows = [
        ['Ticket No', ticketNumber],
        ['Passenger Name', passenger.name],
        ['Bus', busType],
        ['Bus Number', busNumber],
        ['Route', `${routeFrom} -> ${routeTo}`],
        ['Date', `${depDate} (${dayName})`],
        ['Departure Time', depTime],
        ['Arrival Time', arrTime],
        ['Seat No', seats],
        ['Price', `${totalPrice} ETB`],
        ['Payment Status', 'PAID'],
      ];

      let y = 74;
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(label, 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(value), 44, y);
        y += 8;
      });

      // QR code area
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 160, 49, 24, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to Verify Ticket', 42, 188, { align: 'center' });

      // Footer
      doc.setFillColor(6, 43, 30);
      doc.rect(0, 192, 85, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text('Safe Journey!', 6, 197);
      doc.text('www.ethiobus.com', 79, 197, { align: 'right' });

      doc.save(`EthioBus_Ticket_${ticketNumber}.pdf`);
      toast.success('Ticket PDF downloaded!');
    } catch (err) {
      toast.info('Opening print dialog...');
      window.print();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '16px', fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', width: '100%', maxWidth: '380px',
          borderRadius: '20px', boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
          overflow: 'hidden', position: 'relative'
        }}
      >

        {/* ══ DARK GREEN HEADER ══ */}
        <div style={{
          background: 'linear-gradient(135deg, #062b1e 0%, #0a3d29 100%)',
          padding: '14px 16px 10px',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
            }}
          >
            <FaTimes />
          </button>

          {/* Logo & branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#facc15', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.2rem', color: '#062b1e',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(250,204,21,0.4)'
            }}>
              <FaBus />
            </div>
            <div>
              <div style={{
                fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em'
              }}>
                ETHIO <span style={{ color: '#facc15' }}>BUS</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                Smart Bus Ticketing System
              </div>
            </div>
          </div>

          {/* Decorative glow circle */}
          <div style={{
            position: 'absolute', right: -40, top: -40, width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 70%)'
          }} />
        </div>

        {/* ══ TRI-COLOR WAVE RIBBON ══ */}
        <div style={{ display: 'flex', height: '5px', width: '100%', flexShrink: 0 }}>
          <div style={{ flex: 1, background: '#16a34a' }} />
          <div style={{ flex: 1, background: '#facc15' }} />
          <div style={{ flex: 1, background: '#dc2626' }} />
        </div>

        {/* ══ TICKET BODY ══ */}
        <div style={{ padding: '14px 16px 0' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2 style={{
              margin: '0 0 2px', fontSize: '1.3rem', fontWeight: 900,
              color: '#0f172a', letterSpacing: '-0.02em'
            }}>
              E-TICKET
            </h2>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
              Thank you for choosing Ethio Bus!
            </p>
          </div>

          {/* ── Details Key-Value Rows ── */}
          <div style={{
            background: '#f8fafc', borderRadius: '12px', padding: '4px 0',
            border: '1px solid #f1f5f9', marginBottom: '12px'
          }}>
            {[
              { icon: <FaTicketAlt />, label: 'Ticket No', value: ticketNumber, green: true },
              { icon: <FaUser />, label: 'Passenger Name', value: passenger.name },
              { icon: <FaBus />, label: 'Bus', value: busType },
              { icon: <FaBus />, label: 'Bus Number', value: busNumber },
              { icon: <FaRoute />, label: 'Route', value: `${routeFrom} → ${routeTo}` },
              { icon: <FaCalendarAlt />, label: 'Date', value: `${depDate} (${dayName})`, bold: true },
              { icon: <FaClock />, label: 'Departure Time', value: depTime },
              { icon: <FaClock />, label: 'Arrival Time', value: arrTime },
              { icon: <FaChair />, label: 'Seat No', value: seats, blue: true },
              { icon: <FaTag />, label: 'Price', value: `${totalPrice} ETB` },
            ].map((row, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', padding: '7px 12px',
                borderBottom: idx < 9 ? '1px solid #f1f5f9' : 'none',
                gap: '8px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', width: '14px', flexShrink: 0 }}>
                  {row.icon}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, flex: 1 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, marginRight: '6px' }}>
                  :
                </span>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: row.green ? '#16a34a' : row.blue ? '#2563eb' : row.bold ? '#0f172a' : '#334155',
                  textAlign: 'right', flex: 1.5
                }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Payment Status Row */}
            <div style={{
              display: 'flex', alignItems: 'center', padding: '7px 12px', gap: '8px'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', width: '14px', flexShrink: 0 }}>
                <FaShieldAlt />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, flex: 1 }}>
                Payment Status
              </span>
              <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, marginRight: '6px' }}>
                :
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1.5, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a' }}>PAID</span>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem'
                }}>
                  <FaCheckCircle />
                </div>
              </div>
            </div>
          </div>

          {/* ── QR CODE BOX ── */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px',
            padding: '12px', textAlign: 'center', marginBottom: '12px'
          }}>
            <div style={{
              display: 'inline-block', background: '#ffffff', padding: '8px',
              borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              marginBottom: '8px'
            }}>
              <QRCodeSVG
                value={`ETHIOBUS:${ticketNumber}:${passenger.name}:${seats}:${routeFrom}-${routeTo}`}
                size={90}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
              Scan to Verify Ticket
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
              Show this ticket to the agent while boarding
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={handleDownloadPDF}
              style={{
                flex: 1, padding: '9px', background: '#16a34a', color: '#ffffff',
                border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
              }}
            >
              <FaDownload /> Download PDF
            </button>
            <button
              onClick={() => window.print()}
              style={{
                flex: 1, padding: '9px', background: '#ffffff', color: '#334155',
                border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <FaPrint /> Print Pass
            </button>
          </div>
        </div>

        {/* ══ DARK GREEN FOOTER BAR ══ */}
        <div style={{
          background: '#062b1e', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#4ade80', fontSize: '0.82rem', fontWeight: 700 }}>
            <FaShieldAlt />
            <span>Safe Journey!</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
            www.ethiobus.com
          </span>
        </div>

      </div>
    </div>
  );
};

export default TicketModal;
