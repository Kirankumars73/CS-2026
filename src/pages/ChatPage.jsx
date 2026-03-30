import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { HiOutlinePaperAirplane, HiOutlineChat, HiOutlineChatAlt2 } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './ChatPage.css';

const MAX_MESSAGES = 100;

export default function ChatPage() {
  const { currentUser, memberProfile, CLASS_ID } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', CLASS_ID, 'chat'),
      orderBy('createdAt', 'asc'),
      limit(MAX_MESSAGES)
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [CLASS_ID]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'classes', CLASS_ID, 'chat'), {
        text: msg,
        author: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        authorId: currentUser.uid,
        photoURL: memberProfile?.profilePhoto || currentUser?.photoURL || '',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) =>
    (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat__header">
        <HiOutlineChat className="chat__header-icon" />
        <div>
          <h1 className="chat__header-title">CS 2026 Chat</h1>
          <p className="chat__header-sub">Global class chat — say hello! 👋</p>
        </div>
        <Link to="/dm" className="btn btn-glass btn-sm" style={{ marginLeft: 'auto' }}>
          <HiOutlineChatAlt2 /> DMs
        </Link>
      </div>

      {/* Messages */}
      <div className="chat__messages" id="chat-messages">
        {messages.length === 0 && (
          <div className="chat__empty">
            <span>💬</span>
            <p>No messages yet. Be the first to say hi!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.authorId === currentUser?.uid;
          const showAvatar = idx === 0 || messages[idx - 1]?.authorId !== msg.authorId;
          return (
            <div
              key={msg.id}
              className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}
            >
              {!isOwn && showAvatar && (
                <div className="chat-msg__avatar">
                  {msg.photoURL ? (
                    <img src={msg.photoURL} alt={msg.author} className="avatar" style={{ width: 32, height: 32 }} />
                  ) : (
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                      {getInitials(msg.author)}
                    </div>
                  )}
                </div>
              )}
              {!isOwn && !showAvatar && <div className="chat-msg__avatar-spacer" />}
              <div className="chat-msg__content">
                {!isOwn && showAvatar && (
                  <span className="chat-msg__author">{msg.author}</span>
                )}
                <div className="chat-msg__bubble">
                  {msg.text}
                  <span className="chat-msg__time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat__input-bar" onSubmit={handleSend}>
        <input
          id="chat-input"
          type="text"
          className="input-glass chat__input"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          autoComplete="off"
        />
        <button
          id="chat-send-btn"
          type="submit"
          className="chat__send-btn btn btn-primary"
          disabled={!text.trim() || sending}
        >
          <HiOutlinePaperAirplane />
        </button>
      </form>
    </div>
  );
}
