import React from 'react';

const TYPE_CONFIG = {
  site_added:   { icon: '🌐', color: '#22c55e', label: 'Site Added' },
  site_updated: { icon: '✏️', color: '#3b82f6', label: 'Site Updated' },
  site_deleted: { icon: '🗑️', color: '#ef4444', label: 'Site Deleted' },
  info:         { icon: 'ℹ️', color: '#8b5cf6', label: 'Info' },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationPanel({ open, onClose, notifications, onClear }) {
  return (
    <>
      {open && <div className="notif-overlay" onClick={onClose} />}
      <div className={`notif-panel ${open ? 'notif-panel-open' : ''}`}>
        <div className="notif-header">
          <div className="notif-header-left">
            <span className="notif-title">Notifications</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="notif-unread-pill">
                {notifications.filter(n => !n.read).length} new
              </span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {notifications.length > 0 && (
              <button onClick={onClear} style={{ fontSize:12, fontWeight:600, color:'#ef4444', background:'#fef2f2', border:'1px solid #fecdd3', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>
                Clear All
              </button>
            )}
            <button className="notif-close" onClick={onClose}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">🔔</div>
              <div className="notif-empty-text">No notifications yet</div>
              <div className="notif-empty-sub">Actions on sites will appear here</div>
            </div>
          ) : (
            notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              return (
                <div key={n._id} className={`notif-item ${!n.read ? 'notif-item-unread' : ''}`}>
                  <div className="notif-icon-wrap" style={{ background: `${cfg.color}18`, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div className="notif-body">
                    <div className="notif-type-label" style={{ color: cfg.color }}>{cfg.label}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && <div className="notif-dot" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
