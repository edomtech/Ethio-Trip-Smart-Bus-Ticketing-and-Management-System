import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine, FaFilePdf, FaFileExcel, FaArrowUp, FaArrowDown,
  FaUsers, FaBus, FaRoute, FaMoneyBillWave, FaCalendarAlt,
  FaSync, FaTicketAlt, FaTimesCircle, FaCheckCircle, FaUserCheck,
  FaSearch, FaChevronRight, FaFilter
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import {
  bookingAPI, busAPI, routeAPI, userAPI, companyAPI, reportAPI
} from '../../../utils/api';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const etb = (n) => `ETB ${Number(n || 0).toLocaleString('en-ET')}`;
const num = (n) => Number(n || 0).toLocaleString('en-ET');

const GenerateReports = () => {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDrilldown, setActiveDrilldown] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const [bookings, setBookings] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [company, setCompany] = useState(null);

  const datePresets = [
    { id: 'today', label: t('today', 'Today') },
    { id: 'week', label: t('last 7 days', 'Last 7 Days') },
    { id: 'month', label: t('this month', 'This Month') },
    { id: 'year', label: t('this year', 'This Year') },
    { id: 'all', label: t('all time', 'All Time') },
  ];

  useEffect(() => {
    applyPreset('month');
  }, []);

  const applyPreset = (presetId) => {
    setSelectedPreset(presetId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (presetId === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (presetId === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (presetId === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(startOfYear.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (presetId === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [bkRes, busRes, rtRes, usrRes, compRes] = await Promise.allSettled([
        bookingAPI.getAll(),
        busAPI.getAll().catch(() => []),
        routeAPI.getAll().catch(() => []),
        userAPI.getAll({ role: 'passenger' }).catch(() => []),
        companyAPI.getMyCompany().catch(() => null),
      ]);

      const rawBookings = bkRes.status === 'fulfilled'
        ? (Array.isArray(bkRes.value) ? bkRes.value : bkRes.value?.bookings || [])
        : [];
      const rawBuses = busRes.status === 'fulfilled'
        ? (Array.isArray(busRes.value) ? busRes.value : busRes.value?.buses || [])
        : [];
      const rawRoutes = rtRes.status === 'fulfilled'
        ? (Array.isArray(rtRes.value) ? rtRes.value : rtRes.value?.routes || [])
        : [];
      const rawUsers = usrRes.status === 'fulfilled'
        ? (Array.isArray(usrRes.value) ? usrRes.value : usrRes.value?.users || [])
        : [];

      setBookings(rawBookings);
      setBuses(rawBuses);
      setRoutes(rawRoutes);
      setPassengers(rawUsers);
      setCompany(compRes.status === 'fulfilled' ? compRes.value?.company : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const dateVal = b.createdAt || b.bookingDate;
      if (!dateVal) return true;
      const bDate = new Date(dateVal);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (bDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (bDate > end) return false;
      }
      return true;
    });
  }, [bookings, startDate, endDate]);

  const passengerReportData = useMemo(() => {
    const userMap = new Map();
    passengers.forEach((u) => {
      if (u.email) {
        userMap.set(u.email.toLowerCase(), {
          name: u.name,
          email: u.email.toLowerCase(),
          phone: u.phone || '—',
          registeredAt: u.createdAt,
          isRegisteredMember: true,
          bookingsInPeriod: 0,
          spentInPeriod: 0,
        });
      }
    });

    filteredBookings.forEach((b) => {
      const p = b.passenger || b.user;
      const email = (p?.email || '').toLowerCase();
      if (!email) return;

      if (!userMap.has(email)) {
        userMap.set(email, {
          name: p?.name || 'Passenger',
          email,
          phone: p?.phone || '—',
          registeredAt: b.user?.createdAt || b.createdAt,
          isRegisteredMember: !!b.user,
          bookingsInPeriod: 0,
          spentInPeriod: 0,
        });
      }

      const rec = userMap.get(email);
      rec.bookingsInPeriod += 1;
      const fare = Number(b.totalPrice || 0);
      rec.spentInPeriod += fare;
    });

    let list = Array.from(userMap.values());

    if (startDate || endDate) {
      list = list.filter((p) => {
        if (!p.registeredAt) return true;
        const reg = new Date(p.registeredAt);
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (reg < s && p.bookingsInPeriod === 0) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (reg > e && p.bookingsInPeriod === 0) return false;
        }
        return true;
      });
    }

    return list;
  }, [passengers, filteredBookings, startDate, endDate]);

  const metrics = useMemo(() => {
    let revenue = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let refundedAmount = 0;

    filteredBookings.forEach((b) => {
      const st = (b.status || '').toUpperCase();
      const ps = (b.paymentStatus || '').toUpperCase();
      const fare = Number(b.totalPrice || 0);

      const isPaid = ps === 'PAID' || ps === 'COMPLETED';
      const isCancelled = st === 'CANCELLED';
      const isRefunded = ps === 'REFUNDED' || st === 'REFUNDED';

      if (isPaid && !isCancelled && !isRefunded) {
        revenue += fare;
        confirmedCount += 1;
      } else if (isCancelled || isRefunded) {
        cancelledCount += 1;
        refundedAmount += Number(b.refundAmount || (fare * 0.8) || 0);
      } else if (st === 'CONFIRMED') {
        confirmedCount += 1;
      }
    });

    return {
      revenue,
      totalBookings: filteredBookings.length,
      confirmedCount,
      cancelledCount,
      refundedAmount,
      totalPassengers: passengerReportData.length,
      registeredMembersCount: passengerReportData.filter((p) => p.isRegisteredMember).length,
      activeBusesCount: buses.length,
      activeRoutesCount: routes.length,
    };
  }, [filteredBookings, passengerReportData, buses, routes]);

  const kpiCards = [
    {
      id: 'revenue',
      title: t('total revenue', 'Total Revenue'),
      value: etb(metrics.revenue),
      sub: `${num(metrics.confirmedCount)} ${t('confirmed trips', 'confirmed trips')}`,
      icon: <FaMoneyBillWave />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
      activeBorder: 'border-emerald-500 ring-4 ring-emerald-500/10',
    },
    {
      id: 'bookings',
      title: t('total bookings', 'Total Bookings'),
      value: num(metrics.totalBookings),
      sub: `${num(metrics.confirmedCount)} ${t('confirmed', 'confirmed')} · ${num(metrics.cancelledCount)} ${t('cancelled', 'cancelled')}`,
      icon: <FaTicketAlt />,
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600',
      activeBorder: 'border-blue-500 ring-4 ring-blue-500/10',
    },
    {
      id: 'passengers',
      title: t('passenger registrations', 'Passenger Registrations'),
      value: num(metrics.totalPassengers),
      sub: `${num(metrics.registeredMembersCount)} ${t('registered members', 'registered members')}`,
      icon: <FaUsers />,
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600',
      activeBorder: 'border-purple-500 ring-4 ring-purple-500/10',
    },
    {
      id: 'cancellations',
      title: t('cancellations & refunds', 'Cancellations & Refunds'),
      value: num(metrics.cancelledCount),
      sub: `${t('refunded', 'Refunded')}: ${etb(metrics.refundedAmount)}`,
      icon: <FaTimesCircle />,
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600',
      activeBorder: 'border-rose-500 ring-4 ring-rose-500/10',
    },
    {
      id: 'fleet',
      title: t('fleet & routes', 'Fleet & Routes'),
      value: `${num(metrics.activeBusesCount)} ${t('buses', 'Buses')}`,
      sub: `${num(metrics.activeRoutesCount)} ${t('operational routes', 'operational routes')}`,
      icon: <FaBus />,
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
      activeBorder: 'border-amber-500 ring-4 ring-amber-500/10',
    },
  ];

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Ethio Trip — Business Analytics Report', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Company: ${company?.companyName || 'Bus Operator'} · Date Range: ${startDate || 'Start'} to ${endDate || 'Present'}`,
      105,
      28,
      { align: 'center' }
    );

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Performance Summary', 20, 50);

    const rows = [
      ['Total Period Revenue', etb(metrics.revenue)],
      ['Total Bookings Recorded', num(metrics.totalBookings)],
      ['Confirmed Trips', num(metrics.confirmedCount)],
      ['Cancellations & Refunds', `${num(metrics.cancelledCount)} (${etb(metrics.refundedAmount)})`],
      ['Total Passenger Volume', num(metrics.totalPassengers)],
      ['Registered Member Count', num(metrics.registeredMembersCount)],
      ['Active Bus Fleet', `${num(metrics.activeBusesCount)} Buses`],
      ['Active Routes Serviced', `${num(metrics.activeRoutesCount)} Routes`],
    ];

    doc.setFontSize(10);
    rows.forEach(([k, v], i) => {
      doc.setFont('helvetica', 'normal');
      doc.text(k, 25, 62 + i * 11);
      doc.setFont('helvetica', 'bold');
      doc.text(v, 145, 62 + i * 11);
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString()} · Official Company Report`, 105, 280, { align: 'center' });
    doc.save(`Company_Report_${startDate || 'all'}_to_${endDate || 'all'}.pdf`);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value', 'Start Date', 'End Date', 'Company'],
      ['Revenue', String(metrics.revenue), startDate, endDate, company?.companyName || ''],
      ['Total Bookings', String(metrics.totalBookings), startDate, endDate, company?.companyName || ''],
      ['Confirmed Bookings', String(metrics.confirmedCount), startDate, endDate, company?.companyName || ''],
      ['Cancelled Bookings', String(metrics.cancelledCount), startDate, endDate, company?.companyName || ''],
      ['Refund Amount', String(metrics.refundedAmount), startDate, endDate, company?.companyName || ''],
      ['Passengers Volume', String(metrics.totalPassengers), startDate, endDate, company?.companyName || ''],
      ['Registered Members', String(metrics.registeredMembersCount), startDate, endDate, company?.companyName || ''],
      ['Active Buses', String(metrics.activeBusesCount), startDate, endDate, company?.companyName || ''],
      ['Active Routes', String(metrics.activeRoutesCount), startDate, endDate, company?.companyName || ''],
    ];

    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Company_Report_${startDate || 'all'}_to_${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const revenueColumns = [
    {
      header: t('date & time', 'Date & Time'),
      render: (b) => (
        <span className="text-xs font-semibold text-slate-600">
          {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: t('ticket no', 'Ticket No'),
      render: (b) => (
        <span className="font-mono font-black text-emerald-600 text-xs">
          {b.ticketNumber || `TKT-${b._id?.slice(-6).toUpperCase()}`}
        </span>
      ),
    },
    {
      header: t('passenger', 'Passenger'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{b.passenger?.name || b.user?.name || 'Passenger'}</div>
          <div className="text-[11px] text-slate-400 font-mono">{b.passenger?.phone || b.passenger?.email || ''}</div>
        </div>
      ),
    },
    {
      header: t('route', 'Route'),
      render: (b) => (
        <span className="text-xs font-semibold text-slate-700">
          {b.schedule?.route ? `${b.schedule.route.from} → ${b.schedule.route.to}` : 'Scheduled Route'}
        </span>
      ),
    },
    {
      header: t('amount paid', 'Amount Paid'),
      render: (b) => (
        <span className="font-black text-emerald-600 text-sm">
          {etb(b.totalPrice)}
        </span>
      ),
    },
    {
      header: t('payment status', 'Payment Status'),
      render: (b) => (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {b.paymentStatus || 'PAID'}
        </span>
      ),
    },
  ];

  const bookingsColumns = [
    {
      header: t('ticket no', 'Ticket No'),
      render: (b) => (
        <span className="font-mono font-black text-blue-600 text-xs">
          {b.ticketNumber || `TKT-${b._id?.slice(-6).toUpperCase()}`}
        </span>
      ),
    },
    {
      header: t('passenger', 'Passenger'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{b.passenger?.name || b.user?.name || 'Passenger'}</div>
          <div className="text-[11px] text-slate-400 font-mono">{b.passenger?.phone || ''}</div>
        </div>
      ),
    },
    {
      header: t('route', 'Route'),
      render: (b) => (
        <span className="text-xs font-semibold text-slate-700">
          {b.schedule?.route ? `${b.schedule.route.from} → ${b.schedule.route.to}` : 'Scheduled Route'}
        </span>
      ),
    },
    {
      header: t('seats', 'Seats'),
      render: (b) => (
        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
          {Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '1'}
        </span>
      ),
    },
    {
      header: t('fare', 'Fare'),
      render: (b) => (
        <span className="font-bold text-slate-900 text-xs">{etb(b.totalPrice)}</span>
      ),
    },
    {
      header: t('status', 'Status'),
      render: (b) => (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
          b.status === 'CONFIRMED' || b.status === 'COMPLETED'
            ? 'bg-emerald-100 text-emerald-800'
            : b.status === 'CANCELLED'
            ? 'bg-rose-100 text-rose-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {b.status || 'CONFIRMED'}
        </span>
      ),
    },
  ];

  const passengerColumns = [
    {
      header: t('passenger name', 'Passenger Name'),
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
            {p.name?.[0]?.toUpperCase() || 'P'}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">{p.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{p.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: t('phone', 'Phone'),
      render: (p) => (
        <span className="text-xs font-mono text-slate-600">{p.phone}</span>
      ),
    },
    {
      header: t('member status', 'Member Status'),
      render: (p) => (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
          p.isRegisteredMember ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
        }`}>
          {p.isRegisteredMember ? t('registered member', 'Registered Member') : t('guest booking', 'Guest Booking')}
        </span>
      ),
    },
    {
      header: t('registration date', 'Registration Date'),
      render: (p) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">
            {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : '—'}
          </span>
          <span className="block text-[11px] text-slate-400">
            {p.registeredAt ? new Date(p.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      ),
    },
    {
      header: t('period bookings', 'Period Bookings'),
      render: (p) => (
        <span className="font-bold text-blue-600 text-xs">
          {num(p.bookingsInPeriod)} {t('trips', 'trips')}
        </span>
      ),
    },
    {
      header: t('period spend', 'Period Spend'),
      render: (p) => (
        <span className="font-black text-emerald-600 text-xs">
          {etb(p.spentInPeriod)}
        </span>
      ),
    },
  ];

  const cancellationsColumns = [
    {
      header: t('ticket no', 'Ticket No'),
      render: (b) => (
        <span className="font-mono font-black text-rose-600 text-xs">
          {b.ticketNumber || `TKT-${b._id?.slice(-6).toUpperCase()}`}
        </span>
      ),
    },
    {
      header: t('passenger', 'Passenger'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{b.passenger?.name || b.user?.name || 'Passenger'}</div>
          <div className="text-[11px] text-slate-400 font-mono">{b.passenger?.email || ''}</div>
        </div>
      ),
    },
    {
      header: t('route', 'Route'),
      render: (b) => (
        <span className="text-xs font-semibold text-slate-700">
          {b.schedule?.route ? `${b.schedule.route.from} → ${b.schedule.route.to}` : 'Scheduled Route'}
        </span>
      ),
    },
    {
      header: t('refund amount', 'Refund Amount'),
      render: (b) => (
        <span className="font-black text-rose-600 text-xs">
          {etb(b.refundAmount || (Number(b.totalPrice || 0) * 0.8))}
        </span>
      ),
    },
    {
      header: t('refund status', 'Refund Status'),
      render: (b) => (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800">
          {b.refundStatus || (b.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING')}
        </span>
      ),
    },
    {
      header: t('reason', 'Reason'),
      render: (b) => (
        <span className="text-xs text-slate-500 italic max-w-xs truncate block">
          {b.cancellationReason || b.refundReason || 'Passenger cancellation'}
        </span>
      ),
    },
  ];

  const fleetColumns = [
    {
      header: t('bus plate / number', 'Bus Plate / Number'),
      render: (b) => (
        <div>
          <span className="font-black text-slate-900 font-mono text-xs block">{b.plateNumber || b.busNumber}</span>
          <span className="text-[11px] text-slate-400">{b.model || 'Standard Coach'}</span>
        </div>
      ),
    },
    {
      header: t('capacity', 'Capacity'),
      render: (b) => (
        <span className="font-bold text-slate-700 text-xs">{b.capacity || 49} {t('seats', 'Seats')}</span>
      ),
    },
    {
      header: t('bus type', 'Bus Type'),
      render: (b) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          {b.busType || 'Standard'}
        </span>
      ),
    },
    {
      header: t('status', 'Status'),
      render: (b) => (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
          b.status === 'ACTIVE' || b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}>
          {b.status || 'ACTIVE'}
        </span>
      ),
    },
  ];

  const activeDrilldownData = useMemo(() => {
    if (activeDrilldown === 'revenue') {
      return filteredBookings.filter(
        (b) =>
          ((b.paymentStatus || '').toUpperCase() === 'PAID' ||
            (b.paymentStatus || '').toUpperCase() === 'COMPLETED') &&
          (b.status || '').toUpperCase() !== 'CANCELLED'
      );
    }
    if (activeDrilldown === 'bookings') {
      return filteredBookings;
    }
    if (activeDrilldown === 'passengers') {
      return passengerReportData;
    }
    if (activeDrilldown === 'cancellations') {
      return filteredBookings.filter(
        (b) =>
          (b.status || '').toUpperCase() === 'CANCELLED' ||
          (b.paymentStatus || '').toUpperCase() === 'REFUNDED' ||
          (b.refundStatus && b.refundStatus !== 'NONE')
      );
    }
    if (activeDrilldown === 'fleet') {
      return buses;
    }
    return [];
  }, [activeDrilldown, filteredBookings, passengerReportData, buses]);

  const activeDrilldownTitle = {
    revenue: t('revenue & transaction records', 'Revenue & Transaction Records'),
    bookings: t('bookings volume breakdown', 'Bookings Volume Breakdown'),
    passengers: t('passenger volume & registration details', 'Passenger Volume & Registration Details'),
    cancellations: t('cancelled bookings & refund history', 'Cancelled Bookings & Refund History'),
    fleet: t('company fleet & bus utilization', 'Company Fleet & Bus Utilization'),
  }[activeDrilldown];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FaChartLine className="text-emerald-600" /> {t('company business & performance reports', 'Company Business & Performance Reports')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('data strictly scoped to your company filtered by date range', 'Data strictly scoped to your company, filtered by date range. Click any card below to drill into specific records.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
          >
            <FaSync className={loading ? 'animate-spin' : ''} /> {t('common.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FaFilePdf /> {t('common.exportPdf', 'Export PDF')}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FaFileExcel /> {t('common.exportExcel', 'Export CSV')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <FaCalendarAlt /> {t('time period', 'Time Period')}:
            </span>
            {datePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedPreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FaCalendarAlt className="text-emerald-500" />
                {t('filter by date', 'Filter by Date')}:
              </span>
              <input
                type="date"
                value={startDate === endDate ? startDate : (startDate || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  setEndDate(val);
                  setSelectedPreset('custom');
                }}
                className="text-xs py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-semibold focus:border-emerald-500"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    const preset = datePresets.find((p) => p.id === '30days') || datePresets[2];
                    setStartDate(preset.startDate);
                    setEndDate(preset.endDate);
                    setSelectedPreset('30days');
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer"
                  title={t('reset date filter', 'Reset to 30 Days')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const isActive = activeDrilldown === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setActiveDrilldown(card.id)}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 transition-all cursor-pointer relative shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                isActive ? card.activeBorder : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${card.bg}`}>
                  {card.icon}
                </div>
                {isActive && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {t('active view', 'Active View')} ▼
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {card.title}
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {loading ? '…' : card.value}
                </div>
                <div className="text-[11px] font-medium text-slate-400">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FaFilter className="text-emerald-600 text-sm" /> {activeDrilldownTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('showing', 'Showing')} {num(activeDrilldownData.length)} {t('records matching your active filters', 'records matching your active filters')}.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {startDate || t('start', 'Start')} ➔ {endDate || t('present', 'Present')}
          </span>
        </div>

        {activeDrilldown === 'revenue' && (
          <DataTable
            columns={revenueColumns}
            data={activeDrilldownData}
            loading={loading}
            searchTerm={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder={t('search revenue by ticket, passenger, route...', 'Search revenue by ticket, passenger, route...')}
            emptyMessage={t('no revenue records recorded for this time period.', 'No revenue records recorded for this time period.')}
          />
        )}

        {activeDrilldown === 'bookings' && (
          <DataTable
            columns={bookingsColumns}
            data={activeDrilldownData}
            loading={loading}
            searchTerm={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder={t('search bookings by ticket, passenger, route...', 'Search bookings by ticket, passenger, route...')}
            emptyMessage={t('no bookings recorded for this time period.', 'No bookings recorded for this time period.')}
          />
        )}

        {activeDrilldown === 'passengers' && (
          <DataTable
            columns={passengerColumns}
            data={activeDrilldownData}
            loading={loading}
            searchTerm={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder={t('search passenger by name, email, phone...', 'Search passenger by name, email, phone...')}
            emptyMessage={t('no passenger or registration records found in this time period.', 'No passenger or registration records found in this time period.')}
          />
        )}

        {activeDrilldown === 'cancellations' && (
          <DataTable
            columns={cancellationsColumns}
            data={activeDrilldownData}
            loading={loading}
            searchTerm={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder={t('search cancellations by ticket, passenger...', 'Search cancellations by ticket, passenger...')}
            emptyMessage={t('no cancellations or refund requests recorded in this time period.', 'No cancellations or refund requests recorded in this time period.')}
          />
        )}

        {activeDrilldown === 'fleet' && (
          <DataTable
            columns={fleetColumns}
            data={activeDrilldownData}
            loading={loading}
            searchTerm={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder={t('search bus by plate or number...', 'Search bus by plate or number...')}
            emptyMessage={t('no buses found in fleet.', 'No buses found in fleet.')}
          />
        )}
      </div>
    </div>
  );
};

export default GenerateReports;