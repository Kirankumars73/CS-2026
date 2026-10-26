import { useState, useEffect } from 'react';
import { HiOutlineX, HiOutlinePencil } from 'react-icons/hi';
import './YearbookMessageModal.css';

export default function YearbookMessageModal({ recipientName, onSend, onClose, sending }) {
  const [text, setText] = useState('');
  const MAX = 500;
  const firstName = recipientName.split(' ')[0];

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
  };

  return (
    <div className="ymm-overlay" onClick={onClose}>
      <div
        className="ymm-modal"
        role="dialog"
        aria-label={`Sign ${firstName}’s yearbook`}
        onClick={e => e.stopPropagation()}
      >
        <div className="ymm-header">
          <div>
            <p className="section-label">Signing the yearbook of</p>
            <h3 className="ymm-title">{recipientName}</h3>
          </div>
          <button className="ymm-close" onClick={onClose} aria-label="Close">
            <HiOutlineX />
          </button>
        </div>
        <p className="ymm-subtitle">
          One signature per yearbook, and it can’t be changed later. Make it count.
        </p>

        <textarea
          className="ymm-textarea hand"
          placeholder={`Dear ${firstName},`}
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          autoFocus
          rows={6}
          aria-label="Your message"
        />

        <div className="ymm-footer">
          <span className={`ymm-char-count ${text.length >= MAX ? 'ymm-char-count--full' : ''}`}>
            {text.length}/{MAX}
          </span>
          <button className="btn btn-glass" onClick={onClose} disabled={sending}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <HiOutlinePencil />}
            {sending ? 'Signing…' : 'Sign it'}
          </button>
        </div>
      </div>
    </div>
  );
}
