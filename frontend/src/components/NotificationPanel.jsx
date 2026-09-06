import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCheckCircle, FaInfoCircle, FaTimesCircle, FaTimes, FaCheckDouble } from 'react-icons/fa';
import { notificationAPI } from '../utils/api';

const NotificationPanel = ({ role = 'user', onViewAll = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Close dropdown when clicking outside
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

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  const iconFor = (type) => {
    if (type === 'success' || type === 'payment') return <FaCheckCircle style={{ color: '#16a34a' }} />;
    if (type === 'error' || type === 'cancellation') return <FaTimesCircle style={{ color: '#dc2626' }} />;
    return <FaInfoCircle style={{ color: '#0284c7' }} />;
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Clickable Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) fetchNotifs();
          setIsOpen(prev => !prev);
        }}
        title="Notifications"
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: '10px',
          background: isOpen ? '#f0fdf4' : '#f8fafc',
          border: isOpen ? '1.5px solid #10b981' : '1px solid #e2e8f0',
          color: isOpen ? '#10b981' : '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.05rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 900,
              width: 17,
              height: 17,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: '350px',
            maxWidth: '90vw',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: 1100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaBell style={{ color: '#10b981' }} />
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Notifications</strong>
              {unreadCount > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '50px' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <FaCheckDouble /> Mark all
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', padding: 2 }}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: '0.8rem' }}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                <FaBell style={{ fontSize: '1.8rem', opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.82rem', margin: 0, fontWeight: 600 }}>No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => (!n.read && !n.isRead) && markRead(n._id)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '11px 16px',
                    background: (n.read || n.isRead) ? '#ffffff' : '#f0fdf4',
                    borderBottom: '1px solid #f8fafc',
                    cursor: (n.read || n.isRead) ? 'default' : 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{iconFor(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', color: '#0f172a', margin: '0 0 2px', fontWeight: (n.read || n.isRead) ? 500 : 700, lineHeight: 1.3 }}>
                      {n.message || n.title}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  {(!n.read && !n.isRead) && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer view all link */}
          {onViewAll && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#078930',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;

