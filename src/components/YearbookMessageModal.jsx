import { useState } from 'react';
import { HiOutlineX, HiOutlinePaperAirplane } from 'react-icons/hi';
import './YearbookMessageModal.css';

export default function YearbookMessageModal({ recipientName, onSend, onClose, sending }) {
  const [text, setText] = useState('');
  const MAX = 500;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
  };

  return (
    <div className="ymm-overlay" onClick={onClose}>
      <div className="ymm-modal glass-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ymm-header">
          <div className="ymm-header-text">
            <span className="ymm-label">✉️ Yearbook Message</span>
            <h3 className="ymm-title">To {recipientName}</h3>
            <p className="ymm-subtitle">One message only — make it count 💛</p>
          </div>
          <button className="ymm-close btn btn-glass btn-sm" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        {/* Divider */}
        <div className="ymm-divider" />

        {/* Textarea */}
        <div className="ymm-body">
          <textarea
            className="input-glass ymm-textarea"
            placeholder={`Write something meaningful for ${recipientName}…`}
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX))}
            autoFocus
            rows={6}
          />
          <div className="ymm-char-count" style={{ color: text.length >= MAX ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
            {text.length}/{MAX}
          </div>
        </div>

        {/* Actions */}
        <div className="ymm-footer">
          <button className="btn btn-glass" onClick={onClose} disabled={sending}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <HiOutlinePaperAirplane style={{ transform: 'rotate(45deg)' }} />
            )}
            {sending ? 'Sending…' : 'Send Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
