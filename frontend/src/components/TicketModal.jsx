import React, { useState } from 'react';
import { FaTimes, FaDownload, FaPrint, FaTicketAlt } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();
  const [activeLeg, setActiveLeg] = useState('outbound');  

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
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-800"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-2xl flex items-center justify-center mx-auto mb-3.5">
            <FaTicketAlt />
          </div>
          <h3 className="m-0 mb-2 text-slate-900 dark:text-white font-black text-lg">Payment Required</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 leading-relaxed">
            This reservation is pending payment. Official E-Tickets and Ticket IDs are only issued after payment is completed.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/20 transition"
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

  const formattedDate = (() => {
    try {
      if (!depDate) return 'Upcoming';
      const d = new Date(depDate);
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${depDate} (${days[d.getDay()]})`;
      }
    } catch {
    }
    return depDate || 'Upcoming';
  })();

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
    const svgEl = document.querySelector(`#qr-svg-${ticketData.ticketNo}`) || document.querySelector('.ticket-qr-box svg');
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
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Safe Journey!', 8, 205);
    doc.setFont('helvetica', 'normal');
    doc.text('www.ethiotrip.com', 82, 205, { align: 'right' });
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [90, 210] });

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
        await renderTicketPage(doc, outboundData);

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
    { label: t('ticket number', 'Ticket No'), value: currentTicketNo },
    { label: t('Journey Leg', 'Journey Leg'), value: isRoundTrip ? (isOutbound ? t('outbound', 'Outbound Trip') : t('return', 'Return Trip')) : t('One-Way', 'One-Way Trip') },
    { label: t('passenger name', 'Passenger Name'), value: resolvedPassengerName },
    { label: t('operator', 'Bus Company'), value: operatorName },
    { label: t('bus type', 'Bus Type'), value: busType },
    { label: t('bus number', 'Bus Number'), value: busNumber },
    { label: t('route', 'Route'), value: `${routeFrom} -> ${routeTo}` },
    { label: t('date', 'Date'), value: formattedDate },
    { label: t('departure time', 'Departure Time'), value: depTime },
    { label: t('arrival time', 'Arrival Time'), value: arrTime },
    { label: t('seat(s)', 'Seat No'), value: seats },
    { label: t('Leg Fare', 'Leg Fare'), value: `${currentPrice} ETB` },
    { label: t('total amount', 'Total Booking Fare'), value: `${totalPrice} ETB` },
    { label: t('status', 'Payment Status'), value: (paymentStatus || 'PAID').toString().toUpperCase() },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative max-h-[94vh] transition-colors"
      >
        {}
        <div className="h-1.5 bg-red-600 w-full" />
        <div className="h-1 bg-amber-400 w-full" />

        {}
        <button
          onClick={onClose}
          type="button"
          title="Close"
          className="absolute top-3.5 right-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer flex items-center justify-center text-xs z-10 transition"
        >
          <FaTimes />
        </button>

        {}
        {isRoundTrip && (
          <div className="flex bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveLeg('outbound')}
              className={`flex-1 py-2.5 border-b-2 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeLeg === 'outbound'
                  ? 'border-emerald-600 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FaTicketAlt /> {t('outbound ticket', 'Outbound Ticket')}
            </button>
            <button
              type="button"
              onClick={() => setActiveLeg('return')}
              className={`flex-1 py-2.5 border-b-2 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeLeg === 'return'
                  ? 'border-amber-500 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FaTicketAlt /> {t('return ticket', 'Return Ticket')}
            </button>
          </div>
        )}

        {}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-3.5">
          {}
          <div className="text-center mb-1">
            <h1 className="m-0 mb-1 text-2xl font-black text-slate-900 dark:text-white tracking-wide">
              {t('official e-ticket', 'E-TICKET')}
            </h1>
            <p className="m-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('Thank you for choosing', 'Thank you for choosing')} {operatorName}!
            </p>
          </div>

          {}
          <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3.5">
            {ticketRows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                <span className={`text-slate-900 dark:text-white font-extrabold text-right ${row.label.includes('No') ? 'font-mono' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {}
          <div className="ticket-qr-box flex flex-col items-center mt-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="bg-white p-2.5 rounded-xl shadow-sm flex items-center justify-center">
              <QRCodeSVG
                id={`qr-svg-${currentTicketNo}`}
                value={qrVerificationData}
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2">
              {t('show this qr code to the conductor upon boarding', 'Scan to Verify Ticket')}
            </span>
          </div>

          {}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer"
            >
              <FaDownload /> {isRoundTrip ? t('download ticket', 'Download Both (PDF)') : t('download ticket', 'Download E-Ticket')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <FaPrint /> {t('print ticket', 'Print')}
            </button>
          </div>
        </div>

        {}
        <div className="bg-[#062f22] px-5 py-3 flex justify-between items-center text-white text-xs shrink-0">
          <span className="font-extrabold">{t('safe journey!', 'Safe Journey!')}</span>
          <span className="opacity-80 text-[11px]">www.ethiotrip.com</span>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
