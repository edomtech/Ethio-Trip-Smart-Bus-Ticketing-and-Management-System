import React, { useState, useEffect } from 'react';
import {
  FaHeadset, FaPaperPlane, FaPhoneAlt, FaClipboardList,
  FaCheckCircle, FaClock, FaTimesCircle, FaEnvelope, FaUser,
  FaCommentDots, FaReply, FaSearch, FaFilter, FaCheckDouble, FaSync, FaComments
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supportAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';

const CustomerSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.getAll();
      if (Array.isArray(res)) {
        setTickets(res);
        if (selectedTicket) {
          const updatedSelected = res.find((t) => t._id === selectedTicket._id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => {
      fetchTickets();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.warn('Please enter a reply message before sending.');
      return;
    }

    setSendingReply(true);
    try {
      const res = await supportAPI.addMessage(selectedTicket._id, replyText.trim());
      toast.success(`Reply sent to ${selectedTicket.passengerName}!`);
      setReplyText('');
      if (res?.ticket) {
        setSelectedTicket(res.ticket);
      }
      fetchTickets();
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await supportAPI.updateStatus(ticketId, newStatus);
      toast.success(`Conversation status updated to ${newStatus}`);
      if (res?.ticket) setSelectedTicket(res.ticket);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const normStatus = (t.status || 'OPEN').toUpperCase();
    const matchStatus =
      statusFilter === 'all' ||
      normStatus === statusFilter ||
      (statusFilter === 'OPEN' && normStatus === 'OPEN') ||
      (statusFilter === 'RESOLVED' && (normStatus === 'ANSWERED' || normStatus === 'CLOSED' || normStatus === 'RESOLVED'));
    const matchSearch =
      !searchQuery ||
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.passengerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount = tickets.filter((t) => (t.status || '').toUpperCase() === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const answeredCount = tickets.filter((t) => (t.status || '').toUpperCase() === 'ANSWERED').length;
  const closedCount = tickets.filter((t) => (t.status || '').toUpperCase() === 'CLOSED' || (t.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
            Customer Support Desk
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            Manage passenger inquiries, questions, and support message threads for your company
          </p>
        </div>
        <button
          onClick={fetchTickets}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <FaSync /> Refresh
        </button>
      </div>

      {/* KPI Status Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div
          onClick={() => setStatusFilter('OPEN')}
          style={{
            background: statusFilter === 'OPEN' ? '#eff6ff' : '#fff',
            borderRadius: 12,
            padding: 16,
            border: `1.5px solid ${statusFilter === 'OPEN' ? '#3b82f6' : '#e2e8f0'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>New Questions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{openCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Awaiting first reply</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          style={{
            background: statusFilter === 'IN_PROGRESS' ? '#eff6ff' : '#fff',
            borderRadius: 12,
            padding: 16,
            border: `1.5px solid ${statusFilter === 'IN_PROGRESS' ? '#3b82f6' : '#e2e8f0'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>In Progress</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>{inProgressCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active discussion</div>
        </div>

        <div
          onClick={() => setStatusFilter('ANSWERED')}
          style={{
            background: statusFilter === 'ANSWERED' ? '#eff6ff' : '#fff',
            borderRadius: 12,
            padding: 16,
            border: `1.5px solid ${statusFilter === 'ANSWERED' ? '#3b82f6' : '#e2e8f0'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>Answered</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', margin: '4px 0' }}>{answeredCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Agent reply delivered</div>
        </div>

        <div
          onClick={() => setStatusFilter('CLOSED')}
          style={{
            background: statusFilter === 'CLOSED' ? '#eff6ff' : '#fff',
            borderRadius: 12,
            padding: 16,
            border: `1.5px solid ${statusFilter === 'CLOSED' ? '#3b82f6' : '#e2e8f0'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Closed / Resolved</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#64748b', margin: '4px 0' }}>{closedCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Completed inquiries</div>
        </div>
      </div>

      {/* Main Grid: Conversation List on Left, Active Thread on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1.3fr' : '1fr', gap: 20 }}>
        {/* Left: Inquiries List */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search subject, passenger, ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open (New)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ANSWERED">Answered</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <FaComments style={{ fontSize: '2rem', marginBottom: 8, color: '#cbd5e1' }} />
              <p>No support conversations found for this filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '600px', overflowY: 'auto' }}>
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?._id === t._id;
                const status = (t.status || 'OPEN').toUpperCase();
                return (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTicket(t)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      background: isSelected ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{t.passengerName}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: status === 'OPEN' ? '#fee2e2' : status === 'IN_PROGRESS' ? '#fef3c7' : status === 'ANSWERED' ? '#dcfce7' : '#f1f5f9',
                          color: status === 'OPEN' ? '#dc2626' : status === 'IN_PROGRESS' ? '#d97706' : status === 'ANSWERED' ? '#16a34a' : '#64748b',
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', marginBottom: 4 }}>
                      {t.subject}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                      {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].message : t.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <span>Category: {t.category}</span>
                      <span>{new Date(t.updatedAt || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Conversation Thread */}
        {selectedTicket && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '650px' }}>
            {/* Thread Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedTicket.subject}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  From: <strong>{selectedTicket.passengerName}</strong> ({selectedTicket.passengerEmail || selectedTicket.passengerPhone || 'Passenger'})
                  {selectedTicket.ticketNumber && ` • Ticket: ${selectedTicket.ticketNumber}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'CLOSED')}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Close Ticket
                  </button>
                )}
                {selectedTicket.status === 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'OPEN')}
                    style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, background: '#f8fafc' }}>
              {/* Initial ticket text if no structured messages array */}
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: '#fff', padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>
                    {selectedTicket.passengerName} (Passenger)
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.4 }}>
                    {selectedTicket.description}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                    {new Date(selectedTicket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* Thread Messages */}
              {selectedTicket.messages && selectedTicket.messages.map((msg, i) => {
                const isAgentOrStaff = ['agent', 'company_staff', 'company_admin', 'super_admin'].includes(msg.senderRole);
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: isAgentOrStaff ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: isAgentOrStaff ? '#2563eb' : '#fff',
                      color: isAgentOrStaff ? '#fff' : '#1e293b',
                      padding: 14,
                      borderRadius: 14,
                      border: isAgentOrStaff ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isAgentOrStaff ? '#bfdbfe' : '#2563eb', marginBottom: 4 }}>
                      {msg.senderName} {isAgentOrStaff ? '(Ticket Agent / Admin)' : '(Passenger)'}
                    </div>
                    <div style={{ fontSize: '0.88rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isAgentOrStaff ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Type your response to the passenger..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={sendingReply}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaPaperPlane /> {sendingReply ? 'Sending...' : 'Reply'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupport;
