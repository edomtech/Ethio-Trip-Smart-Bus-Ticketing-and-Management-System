import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCheckCircle, FaInfoCircle, FaTimesCircle, FaTimes, FaCheckDouble, FaCalendarAlt } from 'react-icons/fa';
import { notificationAPI } from '../utils/api';

const NotificationPanel = ({ role = 'user', onViewAll = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const panelRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getMyNotifications();
      const list = Array.isArray(res) ? res : (res?.notifications || []);
      setNotifications(list);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    } catch {}
  };

  const handleNotifClick = (n) => {
    setSelectedNotif(n);
    if (!n.read && !n.isRead) markRead(n._id);
  };

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  const iconFor = (type) => {
    if (type === 'success' || type === 'payment') return <FaCheckCircle className="text-emerald-600" />;
    if (type === 'error' || type === 'cancellation') return <FaTimesCircle className="text-red-600" />;
    return <FaInfoCircle className="text-sky-600" />;
  };

  const colorFor = (type) => {
    if (type === 'success' || type === 'payment') return 'bg-emerald-50 border-emerald-200';
    if (type === 'error' || type === 'cancellation') return 'bg-red-50 border-red-200';
    return 'bg-sky-50 border-sky-200';
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="relative" ref={panelRef}>
        {}
        <button
          type="button"
          onClick={() => {
            if (!isOpen) fetchNotifs();
            setIsOpen(prev => !prev);
          }}
          title="Notifications"
          className={`relative w-9 h-9 rounded-xl border flex items-center justify-center text-base cursor-pointer transition-all ${
            isOpen
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <FaBell />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {}
        {isOpen && (
          <div className="absolute top-12 right-0 w-[350px] max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1100] overflow-hidden">
            {}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FaBell className="text-emerald-500" />
                <strong className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</strong>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="bg-transparent border-0 text-emerald-600 dark:text-emerald-400 text-xs font-bold cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    <FaCheckDouble /> Mark all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-sm p-0.5"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="text-center py-6 text-slate-400 text-xs">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400">
                  <FaBell className="text-2xl opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-semibold m-0">No notifications</p>
                </div>
              ) : (
                notifications.map(n => {
                  const isRead = n.read || n.isRead;
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleNotifClick(n)}
                      className={`flex gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        isRead
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          : 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">{iconFor(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-slate-900 dark:text-slate-100 m-0 mb-0.5 leading-snug truncate ${isRead ? 'font-medium' : 'font-bold'}`}>
                          {n.title || n.message}
                        </p>
                        {n.message && n.title && n.message !== n.title && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mb-0.5 line-clamp-1">
                            {n.message}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 m-0">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                      {!isRead && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {}
            {onViewAll && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onViewAll(); }}
                  className="bg-transparent border-0 text-emerald-600 dark:text-emerald-400 text-xs font-bold cursor-pointer hover:underline"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            {}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                colorFor(selectedNotif.type)
              }`}>
                {iconFor(selectedNotif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white m-0 leading-snug">
                  {selectedNotif.title || 'Notification'}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <FaCalendarAlt className="text-slate-400 text-[10px]" />
                  <span className="text-[10px] text-slate-400">
                    {formatDate(selectedNotif.createdAt)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            {}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 m-0 leading-relaxed">
                {selectedNotif.message || selectedNotif.title || 'No message content.'}
              </p>
            </div>

            {}
            {selectedNotif.type && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  selectedNotif.type === 'success' || selectedNotif.type === 'payment'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedNotif.type === 'error' || selectedNotif.type === 'cancellation'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-sky-100 text-sky-800'
                }`}>
                  {selectedNotif.type}
                </span>
                {(selectedNotif.read || selectedNotif.isRead) && (
                  <span className="text-[10px] font-semibold text-slate-400">• Read</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedNotif(null)}
              className="mt-4 w-full py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationPanel;
