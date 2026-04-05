import { HiChevronRight, HiX } from 'react-icons/hi';
import './yearbook-message-card.css';

const getInitials = (name) =>
  (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/**
 * Pill badge showing a sender — avatar + name + arrow to reveal message
 */
export function SenderChip({ message, onClick }) {
  return (
    <button
      className="sender-chip"
      onClick={onClick}
      title={`Open message from ${message.senderName}`}
    >
      {message.senderPhoto ? (
        <img
          src={message.senderPhoto}
          alt={message.senderName}
          className="sender-chip__avatar"
        />
      ) : (
        <span className="sender-chip__avatar--placeholder">
          {getInitials(message.senderName)}
        </span>
      )}
      <span className="sender-chip__name">{message.senderName}</span>
      <span className="sender-chip__arrow">
        <HiChevronRight />
      </span>
    </button>
  );
}

/**
 * Full-screen glass-morphism overlay revealing a yearbook message
 */
export function MessageRevealModal({ message, onClose }) {
  if (!message) return null;

  const formattedDate = message.createdAt?.toDate?.()
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(message.createdAt.toDate())
    : 'Sealed in time';

  return (
    <div
      className="msg-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="msg-card">
        {/* Ambient decorative blobs */}
        <div className="msg-card__blob msg-card__blob--1" />
        <div className="msg-card__blob msg-card__blob--2" />

        {/* Close button */}
        <button className="msg-card__close" onClick={onClose} aria-label="Close">
          <HiX />
        </button>

        {/* Sender header */}
        <div className="msg-card__sender">
          {message.senderPhoto ? (
            <img
              src={message.senderPhoto}
              alt={message.senderName}
              className="msg-card__avatar"
            />
          ) : (
            <span className="msg-card__avatar--placeholder">
              {getInitials(message.senderName)}
            </span>
          )}
          <div>
            <p className="msg-card__sender-label">A yearbook message from</p>
            <p className="msg-card__sender-name">{message.senderName}</p>
          </div>
        </div>

        {/* Separator line */}
        <div className="msg-card__divider" />

        {/* Message body */}
        <div className="msg-card__body">
          <span className="msg-card__quote-mark">&ldquo;</span>
          <p className="msg-card__text">{message.message}</p>
          <span className="msg-card__quote-mark msg-card__quote-mark--close">&rdquo;</span>
        </div>

        {/* Footer */}
        <div className="msg-card__footer">
          <span className="msg-card__date">💌 {formattedDate}</span>
          <span className="msg-card__seal">🔒 Sealed forever</span>
        </div>
      </div>
    </div>
  );
}
