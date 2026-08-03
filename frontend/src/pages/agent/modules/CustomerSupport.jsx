import React, { useState } from 'react';
import { FaHeadset, FaPaperPlane, FaPhoneAlt, FaClipboardList, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import '../../modules.css';

const RECENT_TICKETS = [
  { id: 'ST-001', passenger: 'Almaz Bekele', issue: 'Seat Change Request', status: 'resolved', time: '09:15 AM' },
  { id: 'ST-002', passenger: 'Yonas Tesfaye', issue: 'Lost Boarding Pass', status: 'open', time: '09:42 AM' },
  { id: 'ST-003', passenger: 'Hana Girma',   issue: 'Payment & Refund Issue', status: 'pending', time: '10:08 AM' },
  { id: 'ST-004', passenger: 'Dawit Solomon', issue: 'Booking Assistance', status: 'resolved', time: '10:30 AM' },
];

const CustomerSupport = () => {
  const [form, setForm] = useState({
    passengerName: '', passengerPhone: '', ticketNumber: '',
    issueCategory: 'Booking Assistance', description: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.warning('Please describe the issue'); return; }
    setSubmitted(true);
    toast.success('Support ticket submitted successfully!');
    setTimeout(() => {
      setForm({ passengerName: '', passengerPhone: '', ticketNumber: '', issueCategory: 'Booking Assistance', description: '' });
      setSubmitted(false);
    }, 3000);
  };

  const statusStyle = (status) => {
    if (status === 'resolved') return { bg: '#dcfce7', color: '#15803d', icon: <FaCheckCircle />, label: 'Resolved' };
    if (status === 'pending')  return { bg: '#fef3c7', color: '#b45309', icon: <FaClock />, label: 'Pending' };
    return                           { bg: '#fee2e2', color: '#dc2626', icon: <FaTimesCircle />, label: 'Open' };
  };

  return (
    <div className="mod-wrapper">
      {/* ── Header ── */}
      <div className="cs-header">
        <div className="cs-header-left">
          <div className="cs-header-icon"><FaHeadset /></div>
          <div>
            <h2>Customer Support Desk</h2>
            <p>Assist terminal passengers with booking queries, changes &amp; refunds</p>
          </div>
        </div>
        <div className="cs-stat-pills">
          <div className="cs-stat-pill">
            <span className="cs-pill-val">4</span>
            <span className="cs-pill-lbl">Today's Tickets</span>
          </div>
          <div className="cs-stat-pill green">
            <span className="cs-pill-val">2</span>
            <span className="cs-pill-lbl">Resolved</span>
          </div>
          <div className="cs-stat-pill amber">
            <span className="cs-pill-val">2</span>
            <span className="cs-pill-lbl">Pending</span>
          </div>
        </div>
      </div>

      <div className="cs-body">
        {/* ── Left: Form ── */}
        <div className="cs-form-card">
          <div className="cs-form-card-header">
            <FaClipboardList />
            <span>Log Passenger Support Request</span>
          </div>

          {submitted ? (
            <div className="cs-success-state">
              <div className="cs-success-icon"><FaCheckCircle /></div>
              <h3>Ticket Submitted!</h3>
              <p>Support request logged successfully. Our team will handle it shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="cs-form">
              <div className="cs-grid-2">
                <div className="cs-field">
                  <label>Passenger Name</label>
                  <div className="cs-input-wrap">
                    <input placeholder="e.g. Aynadis Tadele" value={form.passengerName} onChange={e => set('passengerName', e.target.value)} />
                  </div>
                </div>
                <div className="cs-field">
                  <label>Phone Number</label>
                  <div className="cs-input-wrap">
                    <input placeholder="0911223344" value={form.passengerPhone} onChange={e => set('passengerPhone', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="cs-grid-2">
                <div className="cs-field">
                  <label>Ticket # (Optional)</label>
                  <div className="cs-input-wrap">
                    <input placeholder="BK98921" value={form.ticketNumber} onChange={e => set('ticketNumber', e.target.value)} />
                  </div>
                </div>
                <div className="cs-field">
                  <label>Issue Category</label>
                  <div className="cs-input-wrap">
                    <select value={form.issueCategory} onChange={e => set('issueCategory', e.target.value)}>
                      <option>Booking Assistance</option>
                      <option>Payment &amp; Refund Issue</option>
                      <option>Seat Change Request</option>
                      <option>Lost Boarding Pass</option>
                      <option>Schedule Delay Query</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="cs-field">
                <label>Description of Issue</label>
                <div className="cs-input-wrap">
                  <textarea
                    rows={5}
                    placeholder="Explain the passenger's inquiry in detail..."
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="cs-submit-btn">
                <FaPaperPlane /> Submit Support Ticket
              </button>
            </form>
          )}
        </div>

        {/* ── Right: Info + Recent Tickets ── */}
        <div className="cs-right-col">
          {/* Hotline card */}
          <div className="cs-hotline-card">
            <div className="cs-hotline-icon"><FaPhoneAlt /></div>
            <div>
              <h4>HQ Call Center</h4>
              <p>For urgent route cancellations or system issues:</p>
              <strong>+251 11 123 4567 / 9988</strong>
            </div>
          </div>

          {/* Recent tickets */}
          <div className="cs-recent-card">
            <div className="cs-recent-header">
              <h4>Recent Support Tickets</h4>
              <span className="cs-recent-count">{RECENT_TICKETS.length} today</span>
            </div>
            <div className="cs-recent-list">
              {RECENT_TICKETS.map(t => {
                const s = statusStyle(t.status);
                return (
                  <div key={t.id} className="cs-ticket-row">
                    <div className="cs-ticket-top">
                      <span className="cs-ticket-id">{t.id}</span>
                      <span className="cs-ticket-badge" style={{ background: s.bg, color: s.color }}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <div className="cs-ticket-passenger">{t.passenger}</div>
                    <div className="cs-ticket-issue">{t.issue} · {t.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Procedures card */}
          <div className="cs-procedures-card">
            <h4>Quick Terminal Procedures</h4>
            <ul>
              <li>Verify Ethiopian National ID / Passport before reprinting lost tickets.</li>
              <li>Cash refunds at windows require supervisor authorization code.</li>
              <li>Schedule changes can be processed up to 1 hour before departure.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
