import { useState, useEffect } from 'react';
import { FaDownload, FaTicketAlt, FaBus, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaPrint, FaTrash } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../i18n';
import { useNotification } from '../../../contexts/NotificationContext';
import { MESSAGES } from '../../../constants/messages';

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
  const { t } = useTranslation();
  const notify = useNotification();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeLeg, setActiveLeg] = useState('outbound');  

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      if (initialBookings && Array.isArray(initialBookings) && initialBookings.length > 0) {
        const paid = initialBookings.filter(isConfirmedOrPaid).map(normalizeTicketBooking);
        if (isMounted) {
          setBookings(paid);
          if (paid.length > 0) setSelected(prev => prev || paid[0]);
          setLoading(false);
        }
      }

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

  const handleDeleteTicket = async (id, tktNo) => {
    const confirmed = await notify.confirm({
      title: 'Remove Ticket From View?',
      message: `Are you sure you want to remove ticket ${tktNo || ''} from your history?`,
      description: 'This only hides the ticket from this device. Your booking and ticket remain available in your booking history.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    setBookings(prev => {
      const updated = prev.filter(b => b._id !== id);
      if (selected?._id === id) setSelected(updated[0] || null);
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-[60px] px-0 text-slate-500">
        <div className="w-9 h-9 border-[3px] border-slate-200 border-t-[#078930] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-[0.9rem] text-slate-900">Loading your E-Tickets...</p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 max-w-[560px] mx-auto my-5 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#078930] dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
          <FaTicketAlt />
        </div>
        <h3 className="m-0 mb-2 text-[1.2rem] font-extrabold text-slate-900 dark:text-white">
          No Confirmed E-Tickets Yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-[0.88rem] m-0 mb-6 leading-relaxed">
          Your digital E-Tickets and scannable QR verification codes appear here automatically once you book and pay for your trip.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {onBookNow && (
            <button
              type="button"
              onClick={onBookNow}
              className="py-2.5 px-5 bg-[#078930] hover:bg-emerald-700 text-white border-none rounded-lg font-extrabold text-[0.85rem] cursor-pointer inline-flex items-center gap-2 shadow-md shadow-emerald-700/20 transition"
            >
              <FaBus /> Book a Bus Ticket
            </button>
          )}
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="py-2.5 px-4.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-[0.85rem] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition"
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

  const formattedDate = (() => {
    try {
      const d = new Date(depDate);
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${depDate} (${days[d.getDay()]})`;
      }
    } catch {
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
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 90, 3, 'F');
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 3, 90, 1.5, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ETHIO TRIP E-TICKET', 45, 13, { align: 'center' });

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

    let qrDataUrl = null;
    const svgEl = document.querySelector(`#qr-dl-svg-${ticketData.ticketNo}`) || document.querySelector('.ticket-download-qr svg');
    if (svgEl) {
      qrDataUrl = await convertSvgToPng(svgEl);
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(18, y + 2, 54, 44, 3, 3, 'F');

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 32, y + 5, 26, 26);
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Scan to Verify Ticket', 45, y + 38, { align: 'center' });

    doc.setFillColor(6, 47, 34);
    doc.rect(0, 198, 90, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text('Safe Journey!', 8, 205);
    doc.text('www.ethiotrip.com', 82, 205, { align: 'right' });
  };

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
        notify.success(MESSAGES.ticket.downloaded);
      } else {
        await renderTicketPage(doc, outboundData);
        doc.save(`ETicket_${currentTicketNo}.pdf`);
        notify.success(MESSAGES.ticket.downloaded);
      }
    } catch (err) {
      console.error('PDF generation error, falling back to print:', err);
      window.print();
    }
  };

  const ticketRows = [
    { label: t('ticket no', 'Ticket No'), value: currentTicketNo },
    { label: t('passenger name', 'Passenger Name'), value: passengerName },
    { label: t('bus company', 'Bus Company'), value: operatorName },
    { label: t('buses', 'Bus'), value: busType },
    { label: t('bus number', 'Bus Number'), value: busNumber },
    { label: t('trip route', 'Route'), value: `${routeFrom} -> ${routeTo}` },
    { label: t('date', 'Date'), value: formattedDate },
    { label: t('departure time', 'Departure Time'), value: depTime },
    { label: t('arrival time', 'Arrival Time'), value: arrTime },
    { label: t('seat no', 'Seat No'), value: seat },
    { label: t('price', 'Price'), value: `${totalPrice} ETB` },
    { label: t('payment status', 'Payment Status'), value: (paymentStatus || 'PAID').toString().toUpperCase() },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 items-start">

      {}
      <div className="bg-white p-[18px] rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-extrabold text-slate-900 mb-3 text-[0.9rem]">
          {t('confirmed tickets', 'My Confirmed Tickets')} ({bookings.length})
        </h4>
        <div className="flex flex-col gap-2">
          {bookings.length === 0 ? (
            <div className="text-slate-400 text-[0.8rem] py-3 text-center">
              {t('no tickets found', 'No tickets found')}
            </div>
          ) : (
            bookings.map(bk => {
              const isSelected = selected?._id === bk._id;
              return (
                <div key={bk._id} className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setSelected(bk); setActiveLeg('outbound'); }}
                    className={`flex-1 px-[14px] py-[12px] rounded-[10px] text-left cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-2 border-[#078930] bg-green-50'
                        : 'border-2 border-slate-200 bg-white'
                    }`}
                  >
                    <div className="font-extrabold text-[0.85rem] text-slate-900 mb-0.5 flex justify-between">
                      <span>{bk.schedule?.route?.from || 'Origin'} ➔ {bk.schedule?.route?.to || 'Destination'}</span>
                      {bk.tripType === 'round' && <span className="text-[0.68rem] text-amber-600 font-extrabold">🔁 {t('round', 'Round')}</span>}
                    </div>
                    <div className="text-[0.74rem] text-[#078930] font-bold font-mono">{bk.ticketNumber}</div>
                    <div className="text-[0.7rem] text-slate-500 mt-0.5">
                      {bk.schedule?.date} · {bk.companyId?.companyName || 'Ethio Trip'}
                    </div>
                  </button>
                  <button
                    type="button"
                    title={t('delete', 'Delete')}
                    onClick={() => handleDeleteTicket(bk._id, bk.ticketNumber)}
                    className="py-3 px-2.5 rounded-[10px] border border-[1.5px] border-red-200 bg-red-50 text-red-600 cursor-pointer flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {}
      {selected && (
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-200 w-full max-w-[420px]">

            {}
            <div className="h-[5px] bg-red-600 w-full" />
            <div className="h-[2.5px] bg-yellow-400 w-full" />

            {}
            {isRoundTrip && (
              <div className="flex bg-slate-50 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveLeg('outbound')}
                  className={`flex-1 py-[9px] border-none text-[0.78rem] font-extrabold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                    activeLeg === 'outbound'
                      ? 'bg-white text-[#078930] border-b-[3px] border-b-[#078930]'
                      : 'bg-transparent text-slate-500'
                  }`}
                >
                  <FaTicketAlt /> {t('outbound ticket', 'Outbound Ticket')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeg('return')}
                  className={`flex-1 py-[9px] border-none text-[0.78rem] font-extrabold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                    activeLeg === 'return'
                      ? 'bg-white text-amber-600 border-b-[3px] border-b-amber-600'
                      : 'bg-transparent text-slate-500'
                  }`}
                >
                  <FaTicketAlt /> {t('return ticket', 'Return Ticket')}
                </button>
              </div>
            )}

            {}
            <div className="px-6 pt-5 pb-4 flex flex-col gap-3.5">
              {}
              <div className="text-center mb-1.5">
                <h1 className="m-0 mb-1 text-[1.65rem] font-black text-slate-900 tracking-[0.5px]">
                  {t('e-ticket', 'E-TICKET')}
                </h1>
                <p className="m-0 text-[0.82rem] text-slate-500 font-medium">
                  {operatorName}
                </p>
              </div>

              {}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3.5">
                {ticketRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center text-[0.84rem]"
                  >
                    <span className="text-slate-500 font-medium">{row.label}</span>
                    <span className={`text-slate-900 font-extrabold text-right ${row.label === t('ticket no', 'Ticket No') ? 'font-mono' : 'font-[inherit]'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {}
              <div className="ticket-download-qr flex flex-col items-center mt-1.5 p-4 bg-slate-50 rounded-[14px] border border-slate-200">
                <div className="bg-white p-2.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center">
                  <QRCodeSVG
                    id={`qr-dl-svg-${currentTicketNo}`}
                    value={qrVerificationData}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[0.74rem] text-slate-500 font-semibold mt-2">
                  {t('scan to verify ticket', 'Scan to Verify Ticket')}
                </span>
              </div>

              {}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex-1 py-2.5 px-3 bg-[#078930] text-white border-none rounded-lg font-extrabold text-[0.82rem] cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(7,137,48,0.25)] hover:bg-[#056325] transition-colors"
                >
                  <FaDownload /> {isRoundTrip ? t('download both tickets (pdf)', 'Download Both Tickets (PDF)') : t('download e-ticket', 'Download E-Ticket')}
                </button>
                {onViewTicket && (
                  <button
                    type="button"
                    onClick={() => onViewTicket(selected)}
                    className="py-2.5 px-3.5 bg-green-50 text-[#078930] border border-[1.5px] border-green-200 rounded-lg font-extrabold text-[0.82rem] cursor-pointer flex items-center justify-center gap-1.5 hover:bg-green-100 transition-colors"
                    title="Open full E-Ticket modal"
                  >
                    <FaTicketAlt /> {t('full view', 'Full View')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-white text-slate-700 border border-[1.5px] border-slate-300 rounded-lg font-bold text-[0.82rem] cursor-pointer flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                >
                  <FaPrint /> {t('print', 'Print')}
                </button>
              </div>
            </div>

            {}
            <div className="bg-[#062f22] px-5 py-3 flex justify-between items-center text-white text-[0.78rem]">
              <span className="font-extrabold">{t('safe journey!', 'Safe Journey!')}</span>
              <span className="opacity-85 text-[0.74rem]">www.ethiotrip.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDownload;
