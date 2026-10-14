import React, { useState, useEffect } from 'react';
import {
  FaPaperPlane,
  FaSearch, FaSync, FaComments
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supportAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../i18n';

const CustomerSupport = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
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
          const updatedSelected = res.find((tkt) => tkt._id === selectedTicket._id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
        }
      }
    } catch {
      toast.error(t('agent.supportLoadFailed', 'Failed to load support tickets'));
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
      toast.warn(t('agent.enterReplyWarn', 'Please enter a reply message before sending.'));
      return;
    }

    setSendingReply(true);
    try {
      const res = await supportAPI.addMessage(selectedTicket._id, replyText.trim());
      toast.success(`${t('agent.replySentTo', 'Reply sent to')} ${selectedTicket.passengerName}!`);
      setReplyText('');
      if (res?.ticket) {
        setSelectedTicket(res.ticket);
      }
      fetchTickets();
    } catch (err) {
      toast.error(err.message || t('agent.sendReplyFailed', 'Failed to send reply'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await supportAPI.updateStatus(ticketId, newStatus);
      toast.success(`${t('agent.convStatusUpdated', 'Conversation status updated to')} ${newStatus}`);
      if (res?.ticket) setSelectedTicket(res.ticket);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || t('agent.updateStatusFailed', 'Failed to update status'));
    }
  };

  const filteredTickets = tickets.filter((tkt) => {
    const normStatus = (tkt.status || 'OPEN').toUpperCase();
    const matchStatus =
      statusFilter === 'all' ||
      normStatus === statusFilter ||
      (statusFilter === 'OPEN' && normStatus === 'OPEN') ||
      (statusFilter === 'RESOLVED' && (normStatus === 'ANSWERED' || normStatus === 'CLOSED' || normStatus === 'RESOLVED'));
    const matchSearch =
      !searchQuery ||
      tkt.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tkt.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tkt.passengerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tkt.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tkt.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount = tickets.filter((tkt) => (tkt.status || '').toUpperCase() === 'OPEN').length;
  const inProgressCount = tickets.filter((tkt) => (tkt.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const answeredCount = tickets.filter((tkt) => (tkt.status || '').toUpperCase() === 'ANSWERED').length;
  const closedCount = tickets.filter((tkt) => (tkt.status || '').toUpperCase() === 'CLOSED' || (tkt.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="m-0 mb-1 text-[1.4rem] font-black text-slate-900">
            {t('agent.customerSupportDesk', 'Customer Support Desk')}
          </h2>
          <p className="m-0 text-slate-500 text-[0.85rem]">
            {t('agent.customerSupportDeskSub', 'Manage passenger inquiries, questions, and support message threads for your company')}
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-[10px] text-[0.85rem] font-bold cursor-pointer hover:bg-slate-200 transition-colors"
        >
          <FaSync /> {t('common.refresh', 'Refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`rounded-xl p-4 border-[1.5px] cursor-pointer transition-colors ${
            statusFilter === 'OPEN' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[0.72rem] font-extrabold text-red-600 uppercase">{t('agent.newQuestions', 'New Questions')}</div>
          <div className="text-[1.6rem] font-black text-red-600 my-1">{openCount}</div>
          <div className="text-[0.72rem] text-slate-500">{t('agent.awaitingFirstReply', 'Awaiting first reply')}</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`rounded-xl p-4 border-[1.5px] cursor-pointer transition-colors ${
            statusFilter === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[0.72rem] font-extrabold text-amber-600 uppercase">{t('agent.inProgress', 'In Progress')}</div>
          <div className="text-[1.6rem] font-black text-amber-600 my-1">{inProgressCount}</div>
          <div className="text-[0.72rem] text-slate-500">{t('agent.activeDiscussion', 'Active discussion')}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ANSWERED')}
          className={`rounded-xl p-4 border-[1.5px] cursor-pointer transition-colors ${
            statusFilter === 'ANSWERED' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[0.72rem] font-extrabold text-green-600 uppercase">{t('agent.answered', 'Answered')}</div>
          <div className="text-[1.6rem] font-black text-green-600 my-1">{answeredCount}</div>
          <div className="text-[0.72rem] text-slate-500">{t('agent.replyDelivered', 'Agent reply delivered')}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`rounded-xl p-4 border-[1.5px] cursor-pointer transition-colors ${
            statusFilter === 'CLOSED' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase">{t('agent.closedResolved', 'Closed / Resolved')}</div>
          <div className="text-[1.6rem] font-black text-slate-600 my-1">{closedCount}</div>
          <div className="text-[0.72rem] text-slate-500">{t('agent.completedInquiries', 'Completed inquiries')}</div>
        </div>
      </div>

      <div className={`grid gap-5 ${selectedTicket ? 'grid-cols-1 lg:grid-cols-[1fr_1.3fr]' : 'grid-cols-1'}`}>
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5">
          <div className="flex gap-2.5 mb-3.5 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('agent.searchSupportPlaceholder', 'Search subject, passenger, ticket...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pr-3 pl-8.5 rounded-lg border border-slate-300 text-[0.85rem] focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 rounded-lg border border-slate-300 text-[0.85rem] focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
              <option value="OPEN">{t('agent.openNew', 'Open (New)')}</option>
              <option value="IN_PROGRESS">{t('agent.inProgress', 'In Progress')}</option>
              <option value="ANSWERED">{t('agent.answered', 'Answered')}</option>
              <option value="CLOSED">{t('agent.closed', 'Closed')}</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-7.5 text-slate-400">{t('agent.loadingSupportTickets', 'Loading support tickets...')}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-10 px-5 text-slate-400">
              <FaComments className="text-[2rem] mb-2 text-slate-300 mx-auto" />
              <p>{t('agent.noConversationsFound', 'No support conversations found for this filter.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto">
              {filteredTickets.map((tkt) => {
                const isSelected = selectedTicket?._id === tkt._id;
                const status = (tkt.status || 'OPEN').toUpperCase();
                return (
                  <div
                    key={tkt._id}
                    onClick={() => setSelectedTicket(tkt)}
                    className={`p-3.5 rounded-xl border-[1.5px] cursor-pointer transition-all duration-150 ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-slate-900 text-[0.9rem]">{tkt.passengerName}</span>
                      <span
                        className={`text-[0.7rem] font-extrabold px-2 py-0.5 rounded-full ${
                          status === 'OPEN'
                            ? 'bg-red-100 text-red-600'
                            : status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-600'
                            : status === 'ANSWERED'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 text-[0.85rem] mb-1">
                      {tkt.subject}
                    </div>

                    <div className="text-[0.78rem] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap mb-1.5">
                      {tkt.messages && tkt.messages.length > 0 ? tkt.messages[tkt.messages.length - 1].message : tkt.description}
                    </div>

                    <div className="flex justify-between text-[0.72rem] text-slate-400">
                      <span>{t('conductor.categoryTrip', 'Category')}: {tkt.category}</span>
                      <span>{new Date(tkt.updatedAt || tkt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedTicket && (
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[650px] overflow-hidden shadow-sm">
            <div className="p-4 px-5 border-b border-slate-200 flex justify-between items-center bg-white">
              <div>
                <h4 className="m-0 mb-0.5 text-base font-extrabold text-slate-900">
                  {selectedTicket.subject}
                </h4>
                <div className="text-[0.78rem] text-slate-500">
                  {t('agent.from', 'From')}: <strong>{selectedTicket.passengerName}</strong> ({selectedTicket.passengerEmail || selectedTicket.passengerPhone || 'Passenger'})
                  {selectedTicket.ticketNumber && ` • ${t('ticket.ticketNumber', 'Ticket')}: ${selectedTicket.ticketNumber}`}
                </div>
              </div>

              <div className="flex gap-2">
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'CLOSED')}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-[0.75rem] font-bold cursor-pointer hover:bg-slate-200 transition-colors"
                  >
                    {t('agent.closeTicket', 'Close Ticket')}
                  </button>
                )}
                {selectedTicket.status === 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'OPEN')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[0.75rem] font-bold cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {t('agent.reopen', 'Reopen')}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3.5 bg-slate-50">
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <div className="self-start max-w-[80%] bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[0.75rem] font-extrabold text-blue-600 mb-1">
                    {selectedTicket.passengerName} ({t('passenger.passenger', 'Passenger')})
                  </div>
                  <div className="text-[0.88rem] text-slate-800 leading-relaxed">
                    {selectedTicket.description}
                  </div>
                  <div className="text-[0.68rem] text-slate-400 mt-1 text-right">
                    {new Date(selectedTicket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {selectedTicket.messages && selectedTicket.messages.map((msg, i) => {
                const isAgentOrStaff = ['agent', 'company_staff', 'company_admin', 'super_admin'].includes(msg.senderRole);
                return (
                  <div
                    key={i}
                    className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm ${
                      isAgentOrStaff
                        ? 'self-end bg-blue-600 text-white'
                        : 'self-start bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <div className={`text-[0.72rem] font-extrabold mb-1 ${isAgentOrStaff ? 'text-blue-200' : 'text-blue-600'}`}>
                      {msg.senderName} {isAgentOrStaff ? `(${t('ticket agent', 'Ticket Agent / Admin')})` : `(${t('passenger.passenger', 'Passenger')})`}
                    </div>
                    <div className="text-[0.88rem] leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </div>
                    <div className={`text-[0.68rem] mt-1 text-right ${isAgentOrStaff ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendReply} className="p-3.5 px-5 border-t border-slate-200 bg-white flex gap-2.5">
              <input
                type="text"
                placeholder={t('agent.replyPlaceholder', 'Type your response to the passenger...')}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-[0.88rem] outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sendingReply}
                className="px-4.5 py-2.5 bg-blue-600 text-white border-none rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-75"
              >
                <FaPaperPlane /> {sendingReply ? t('common.sending', 'Sending...') : t('agent.reply', 'Reply')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupport;
