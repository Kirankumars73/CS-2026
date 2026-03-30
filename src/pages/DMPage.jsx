import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  collection, addDoc, onSnapshot, query, orderBy, limit,
  doc, setDoc, getDoc, serverTimestamp, where
} from 'firebase/firestore';
import { HiOutlinePaperAirplane, HiOutlineArrowLeft, HiOutlineSearch, HiOutlineChatAlt2 } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './DMPage.css';

const MAX_MESSAGES = 80;

// Generate deterministic conversation ID from two user IDs
function getConvId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export default function DMPage() {
  const { currentUser, memberProfile, CLASS_ID } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { id, partnerId, partnerName, partnerPhoto }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  // Load all members
  useEffect(() => {
    const q = query(collection(db, 'classes', CLASS_ID, 'members'));
    return onSnapshot(q, snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [CLASS_ID]);

  // Load conversations metadata where current user is a participant
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'classes', CLASS_ID, 'dms'),
      where('participants', 'array-contains', currentUser.uid)
    );
    return onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [CLASS_ID, currentUser]);

  // Auto-open conversation from URL param (?user=xxx)
  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (targetUserId && members.length > 0 && currentUser) {
      const partner = members.find(m => m.id === targetUserId);
      if (partner && partner.id !== currentUser.uid) {
        openConversation(partner);
      }
    }
  }, [searchParams, members, currentUser]);

  // Listen to messages of active conversation
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    const q = query(
      collection(db, 'classes', CLASS_ID, 'dms', activeConv.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(MAX_MESSAGES)
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [activeConv, CLASS_ID]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (partner) => {
    const convId = getConvId(currentUser.uid, partner.id);
    setActiveConv({
      id: convId,
      partnerId: partner.id,
      partnerName: partner.name || partner.displayName || 'Unknown',
      partnerPhoto: partner.profilePhoto || partner.photoURL || '',
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !activeConv) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      const convRef = doc(db, 'classes', CLASS_ID, 'dms', activeConv.id);

      // Ensure conversation metadata exists
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [currentUser.uid, activeConv.partnerId],
          createdAt: serverTimestamp(),
        });
      }

      // Add the message
      await addDoc(collection(db, 'classes', CLASS_ID, 'dms', activeConv.id, 'messages'), {
        text: msg,
        senderId: currentUser.uid,
        senderName: memberProfile?.name || currentUser?.displayName || 'Anonymous',
        senderPhoto: memberProfile?.profilePhoto || currentUser?.photoURL || '',
        createdAt: serverTimestamp(),
      });

      // Update last message on conversation
      await setDoc(convRef, {
        lastMessage: msg,
        lastMessageAt: serverTimestamp(),
        lastSenderId: currentUser.uid,
      }, { merge: true });
    } catch (err) {
      console.error('DM send failed:', err);
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

  // Build contacts list: merge existing conversations with all members
  const otherMembers = members.filter(m => m.id !== currentUser?.uid);
  const filteredMembers = otherMembers.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.rollNumber?.toString().includes(search)
  );

  // Contacts with existing convos (sorted by last message time)
  const recentConvos = conversations
    .map(conv => {
      const partnerId = conv.participants?.find(p => p !== currentUser?.uid);
      const partner = members.find(m => m.id === partnerId);
      return partner ? { ...conv, partner } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.lastMessageAt?.toDate?.() || new Date(0);
      const tb = b.lastMessageAt?.toDate?.() || new Date(0);
      return tb - ta;
    });

  const recentPartnerIds = new Set(recentConvos.map(c => c.partner.id));
  const newContacts = filteredMembers.filter(m => !recentPartnerIds.has(m.id));

  return (
    <div className="dm-page">
      {/* Sidebar */}
      <div className={`dm-sidebar ${activeConv ? 'dm-sidebar--hidden-mobile' : ''}`}>
        <div className="dm-sidebar__header">
          <HiOutlineChatAlt2 className="dm-sidebar__icon" />
          <h2>Direct Messages</h2>
        </div>

        <div className="dm-sidebar__search">
          <HiOutlineSearch className="dm-sidebar__search-icon" />
          <input
            type="text"
            className="input-glass dm-sidebar__search-input"
            placeholder="Search classmates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="dm-sidebar__list">
          {/* Recent conversations */}
          {recentConvos.length > 0 && (
            <>
              <div className="dm-sidebar__section-label">Recent</div>
              {recentConvos.map(conv => (
                <button
                  key={conv.id}
                  className={`dm-contact ${activeConv?.id === conv.id ? 'dm-contact--active' : ''}`}
                  onClick={() => openConversation(conv.partner)}
                >
                  <div className="dm-contact__avatar">
                    {conv.partner.profilePhoto ? (
                      <img src={conv.partner.profilePhoto} alt={conv.partner.name} className="avatar" />
                    ) : (
                      <div className="avatar-placeholder">{getInitials(conv.partner.name)}</div>
                    )}
                  </div>
                  <div className="dm-contact__info">
                    <span className="dm-contact__name">{conv.partner.name}</span>
                    {conv.lastMessage && (
                      <span className="dm-contact__preview">
                        {conv.lastSenderId === currentUser?.uid ? 'You: ' : ''}{conv.lastMessage.slice(0, 40)}
                        {conv.lastMessage.length > 40 ? '…' : ''}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* All classmates (not yet in conversation) */}
          {newContacts.length > 0 && (
            <>
              <div className="dm-sidebar__section-label">
                {recentConvos.length > 0 ? 'All Classmates' : 'Classmates'}
              </div>
              {newContacts.map(m => (
                <button
                  key={m.id}
                  className={`dm-contact ${activeConv?.partnerId === m.id ? 'dm-contact--active' : ''}`}
                  onClick={() => openConversation(m)}
                >
                  <div className="dm-contact__avatar">
                    {m.profilePhoto ? (
                      <img src={m.profilePhoto} alt={m.name} className="avatar" />
                    ) : (
                      <div className="avatar-placeholder">{getInitials(m.name)}</div>
                    )}
                  </div>
                  <div className="dm-contact__info">
                    <span className="dm-contact__name">{m.name || 'Unnamed'}</span>
                    {m.rollNumber && <span className="dm-contact__roll">Roll #{m.rollNumber}</span>}
                  </div>
                </button>
              ))}
            </>
          )}

          {filteredMembers.length === 0 && !recentConvos.length && (
            <div className="dm-sidebar__empty">No classmates found</div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={`dm-chatview ${!activeConv ? 'dm-chatview--hidden-mobile' : ''}`}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="dm-chatview__header">
              <button className="dm-chatview__back" onClick={() => setActiveConv(null)}>
                <HiOutlineArrowLeft />
              </button>
              <div className="dm-chatview__avatar">
                {activeConv.partnerPhoto ? (
                  <img src={activeConv.partnerPhoto} alt={activeConv.partnerName} className="avatar" />
                ) : (
                  <div className="avatar-placeholder">{getInitials(activeConv.partnerName)}</div>
                )}
              </div>
              <div className="dm-chatview__header-info">
                <span className="dm-chatview__name">{activeConv.partnerName}</span>
                <span className="dm-chatview__sub">Private conversation</span>
              </div>
            </div>

            {/* Messages */}
            <div className="dm-chatview__messages">
              {messages.length === 0 && (
                <div className="dm-chatview__empty">
                  <span>💬</span>
                  <p>No messages yet. Say hello to {activeConv.partnerName}!</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isOwn = msg.senderId === currentUser?.uid;
                const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                return (
                  <div
                    key={msg.id}
                    className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}
                  >
                    {!isOwn && showAvatar && (
                      <div className="chat-msg__avatar">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt={msg.senderName} className="avatar" style={{ width: 32, height: 32 }} />
                        ) : (
                          <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                            {getInitials(msg.senderName)}
                          </div>
                        )}
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="chat-msg__avatar-spacer" />}
                    <div className="chat-msg__content">
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
            <form className="dm-chatview__input-bar" onSubmit={handleSend}>
              <input
                type="text"
                className="input-glass dm-chatview__input"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={500}
                autoComplete="off"
              />
              <button
                type="submit"
                className="dm-chatview__send-btn btn btn-primary"
                disabled={!text.trim() || sending}
              >
                <HiOutlinePaperAirplane />
              </button>
            </form>
          </>
        ) : (
          <div className="dm-chatview__placeholder">
            <div className="dm-chatview__placeholder-icon">💬</div>
            <h3>Select a classmate</h3>
            <p>Choose someone from the list to start a private conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
