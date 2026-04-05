import { useState } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import './YearbookMessageInbox.css';

function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function MessageCard({ msg, isOpen, onToggle }) {
  const date = msg.createdAt?.toDate
    ? msg.createdAt.toDate()
    : msg.createdAt
      ? new Date(msg.createdAt)
      : null;

  const formattedDate = date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className={`ymb-card ${isOpen ? 'ymb-card--open' : ''}`}>
      {/* Sender pill — always visible */}
      <button className="ymb-sender-row" onClick={onToggle} aria-expanded={isOpen}>
        <div className="ymb-avatar-wrap">
          {msg.senderPhotoURL ? (
            <img src={msg.senderPhotoURL} alt={msg.senderName} className="ymb-avatar" />
          ) : (
            <div className="ymb-avatar ymb-avatar--placeholder">
              {getInitials(msg.senderName)}
            </div>
          )}
          <span className="ymb-avatar-glow" />
        </div>
        <div className="ymb-sender-info">
          <span className="ymb-sender-name">{msg.senderName || 'Unknown'}</span>
          {formattedDate && <span className="ymb-sender-date">{formattedDate}</span>}
        </div>
        <div className={`ymb-arrow ${isOpen ? 'ymb-arrow--open' : ''}`}>
          <HiOutlineChevronRight />
        </div>
      </button>

      {/* Message content — expands when open */}
      <div className={`ymb-message-wrap ${isOpen ? 'ymb-message-wrap--visible' : ''}`}>
        <div className="ymb-message-inner">
          <div className="ymb-message-divider" />
          <p className="ymb-message-text">"{msg.text}"</p>
        </div>
      </div>
    </div>
  );
}

export default function YearbookMessageInbox({ messages }) {
  const [openId, setOpenId] = useState(null);

  if (!messages || messages.length === 0) return null;

  return (
    <div className="ymb-inbox">
      <div className="ymb-inbox-header">
        <span className="ymb-inbox-label">💌 Messages from Classmates</span>
        <span className="ymb-inbox-count">{messages.length}</span>
      </div>
      <div className="ymb-list">
        {messages.map(msg => (
          <MessageCard
            key={msg.id}
            msg={msg}
            isOpen={openId === msg.id}
            onToggle={() => setOpenId(prev => prev === msg.id ? null : msg.id)}
          />
        ))}
      </div>
    </div>
  );
}
