import React, { useState } from 'react';
import {
  FaChartLine, FaFilePdf, FaFileExcel, FaArrowUp,
  FaUsers, FaBus, FaRoute, FaMoneyBillWave
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import '../../modules.css';

const KPI_CARDS = [
  { label: 'Daily Revenue', value: 'Br 34,500', icon: <FaMoneyBillWave />, trend: '+12%', color: '#6c2bd9', bg: '#f3e8ff', trendBg: '#ede9fe' },
  { label: 'Monthly Revenue', value: 'Br 245,670', icon: <FaChartLine />, trend: '+18%', color: '#078930', bg: '#dcfce7', trendBg: '#d1fae5' },
  { label: 'Total Passengers', value: '12,458', icon: <FaUsers />, trend: '+8%', color: '#0284c7', bg: '#e0f2fe', trendBg: '#bae6fd' },
  { label: 'Active Buses', value: '128', icon: <FaBus />, trend: '+5%', color: '#d97706', bg: '#fef3c7', trendBg: '#fde68a' },
  { label: 'Total Routes', value: '45', icon: <FaRoute />, trend: '+3', color: '#db2777', bg: '#fce7f3', trendBg: '#fbcfe8' },
];

const PERIOD_OPTIONS = ['Daily Summary', 'Weekly Overview', 'Monthly Financial', 'Yearly Audit'];
const CATEGORY_OPTIONS = ['Revenue & Payments', 'Passenger Volume', 'Route Utilization', 'Agent Sales'];

const GenerateReports = () => {
  const [period, setPeriod] = useState('Monthly Financial');
  const [category, setCategory] = useState('Revenue & Payments');

  const handleExportPDF = () => {
    const doc = new jsPDF();
    // Header bar
    doc.setFillColor(7, 137, 48);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EthioBus Analytics Report', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${period.toUpperCase()} · ${category.toUpperCase()}`, 105, 29, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ET')}`, 20, 52);
    doc.text(`Report Period: ${period}`, 20, 62);
    doc.text(`Category: ${category}`, 20, 72);

    // Divider
    doc.setDrawColor(7, 137, 48);
    doc.setLineWidth(0.5);
    doc.line(20, 80, 190, 80);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 20, 92);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rows = [
      ['Daily Revenue', 'ETB 34,500'],
      ['Monthly Revenue', 'ETB 245,670'],
      ['Total Passengers Served', '12,458'],
      ['Active Fleet Size', '128 Buses'],
      ['Total Active Routes', '45 Routes'],
    ];
    rows.forEach(([k, v], i) => {
      doc.text(k, 25, 104 + i * 12);
      doc.setFont('helvetica', 'bold');
      doc.text(v, 150, 104 + i * 12);
      doc.setFont('helvetica', 'normal');
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('EthioBus Smart Ticketing System — Confidential Report', 105, 280, { align: 'center' });

    doc.save(`EthioBus_${period.replace(/\s+/g, '_')}_Report.pdf`);
    toast.success('PDF report exported successfully!');
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value', 'Period', 'Category'],
      ['Daily Revenue', 'ETB 34,500', period, category],
      ['Monthly Revenue', 'ETB 245,670', period, category],
      ['Total Passengers', '12,458', period, category],
      ['Active Buses', '128', period, category],
      ['Total Routes', '45', period, category],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EthioBus_${period.replace(/\s+/g, '_')}_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report exported!');
  };

  return (
    <div className="mod-wrapper">
      {/* ── Header ── */}
      <div className="gr-header">
        <div className="gr-header-left">
          <div className="gr-header-icon"><FaChartLine /></div>
          <div>
            <h2>Generate System Reports</h2>
            <p>Analytical revenue &amp; ticketing performance reporting</p>
          </div>
        </div>
        <div className="gr-export-btns">
          <button onClick={handleExportPDF} className="gr-btn gr-btn-pdf">
            <FaFilePdf /> Export PDF
          </button>
          <button onClick={handleExportCSV} className="gr-btn gr-btn-csv">
            <FaFileExcel /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="gr-kpi-grid">
        {KPI_CARDS.map((k, i) => (
          <div key={i} className="gr-kpi-card">
            <div className="gr-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
            <div className="gr-kpi-body">
              <span className="gr-kpi-label">{k.label}</span>
              <strong className="gr-kpi-value" style={{ color: k.color }}>{k.value}</strong>
              <span className="gr-kpi-trend" style={{ background: k.trendBg, color: k.color }}>
                <FaArrowUp /> {k.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Report Builder ── */}
      <div className="gr-builder-row">
        <div className="gr-builder-card">
          <h3>Configure Report</h3>

          <div className="gr-config-section">
            <label>Time Period</label>
            <div className="gr-pill-row">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className={`gr-pill ${period === opt ? 'active' : ''}`}
                  onClick={() => setPeriod(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="gr-config-section">
            <label>Report Category</label>
            <div className="gr-pill-row">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className={`gr-pill ${category === opt ? 'active' : ''}`}
                  onClick={() => setCategory(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="gr-export-row">
            <button onClick={handleExportPDF} className="gr-btn gr-btn-pdf gr-btn-lg">
              <FaFilePdf /> Export Official PDF Report
            </button>
            <button onClick={handleExportCSV} className="gr-btn gr-btn-csv gr-btn-lg">
              <FaFileExcel /> Export CSV / Excel Sheet
            </button>
          </div>
        </div>

        {/* Mini Summary Table */}
        <div className="gr-summary-card">
          <h3>Performance Summary</h3>
          <table className="gr-summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>This Month</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'Revenue', val: 'Br 245,670', change: '+18.3%', positive: true },
                { metric: 'Passengers', val: '12,458', change: '+8.2%', positive: true },
                { metric: 'Bookings', val: '14,220', change: '+12.7%', positive: true },
                { metric: 'Cancellations', val: '284', change: '-3.1%', positive: false },
                { metric: 'Avg. Fare', val: 'Br 725', change: '+5.4%', positive: true },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.metric}</td>
                  <td style={{ fontWeight: 800, color: '#6c2bd9' }}>{row.val}</td>
                  <td>
                    <span className={`gr-change-badge ${row.positive ? 'pos' : 'neg'}`}>
                      {row.positive ? '▲' : '▼'} {row.change}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GenerateReports;
