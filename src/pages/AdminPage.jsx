import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, getDoc, writeBatch,
  where, limit, getCountFromServer, Timestamp, deleteField,
} from 'firebase/firestore';
import { HiOutlineLightningBolt, HiX, HiOutlineUsers, HiOutlinePhotograph, HiOutlineClipboard, HiOutlineCalendar } from 'react-icons/hi';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CHAT_RETENTION_DAYS, CHAT_RETENTION_MS } from '../utils/chat';
import { fetchAllDetails, detailsRef } from '../utils/details';
import './AdminPage.css';

const TABS = [
  { key: 'members', label: 'Members', icon: <HiOutlineUsers /> },
  { key: 'gallery',  label: 'Gallery',  icon: <HiOutlinePhotograph /> },
  { key: 'wall',     label: 'Wall',     icon: <HiOutlineClipboard /> },
  { key: 'events',   label: 'Events',   icon: <HiOutlineCalendar /> },
];

// Chat messages older than the retention period
const oldChatQuery = (classId) => query(
  collection(db, 'classes', classId, 'chat'),
  where('createdAt', '<', Timestamp.fromMillis(Date.now() - CHAT_RETENTION_MS))
);

export default function AdminPage() {
  const { isAdmin, CLASS_ID } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('members');
  const [data, setData] = useState({ members: [], gallery: [], wall: [], events: [] });
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [oldChatCount, setOldChatCount] = useState(null);
  const [cleaningChat, setCleaningChat] = useState(false);
  const [chatCleanResult, setChatCleanResult] = useState(null);
  const [details, setDetails] = useState({});
  const [movingEmails, setMovingEmails] = useState(false);
  const [moveEmailsResult, setMoveEmailsResult] = useState(null);

  // Emails now live in the members-only details records
  useEffect(() => {
    if (!isAdmin) return;
    fetchAllDetails(CLASS_ID)
      .then(setDetails)
      .catch(err => console.error('Could not load details:', err));
  }, [isAdmin, CLASS_ID]);

  const publicEmails = data.members.filter(m => m.email);

  // One-off: move emails out of the public member profiles into the members-only details records
  const handleMoveEmails = async () => {
    if (!window.confirm(`Move ${publicEmails.length} email addresses out of the public profiles?`)) return;
    setMovingEmails(true);
    setMoveEmailsResult(null);
    try {
      const batch = writeBatch(db);
      for (const m of publicEmails) {
        batch.set(detailsRef(CLASS_ID, m.id), { email: m.email }, { merge: true });
        batch.update(doc(db, 'classes', CLASS_ID, 'members', m.id), { email: deleteField() });
      }
      await batch.commit();
      setDetails(await fetchAllDetails(CLASS_ID));
      setMoveEmailsResult({ ok: true, moved: publicEmails.length });
    } catch (err) {
      console.error('Move emails error:', err);
      setMoveEmailsResult({ ok: false, error: err.message });
    } finally {
      setMovingEmails(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    getCountFromServer(oldChatQuery(CLASS_ID))
      .then(snap => setOldChatCount(snap.data().count))
      .catch(err => console.error('Could not count old chat messages:', err));
  }, [isAdmin, CLASS_ID]);

  // Deletes old chat messages in batches. New messages are removed automatically by the Firestore TTL policy.
  const handleDeleteOldChat = async () => {
    if (!window.confirm(`Delete ${oldChatCount} chat messages older than ${CHAT_RETENTION_DAYS} days? This is permanent.`)) return;
    setCleaningChat(true);
    setChatCleanResult(null);
    try {
      let deleted = 0;
      for (;;) {
        const snap = await getDocs(query(oldChatQuery(CLASS_ID), limit(400)));
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += snap.size;
      }
      setOldChatCount(0);
      setChatCleanResult({ ok: true, deleted });
    } catch (err) {
      console.error('Chat cleanup error:', err);
      setChatCleanResult({ ok: false, error: err.message });
    } finally {
      setCleaningChat(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) { navigate('/yearbook'); return; }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const subs = [];
    const collections = {
      members: ['members', 'name'],
      gallery:  ['gallery',  'createdAt'],
      wall:     ['wall',     'createdAt'],
      events:   ['events',   'createdAt'],
    };
    for (const [key, [col, orderField]] of Object.entries(collections)) {
      const q = query(
        collection(db, 'classes', CLASS_ID, col),
        orderBy(orderField, key === 'members' ? 'asc' : 'desc')
      );
      subs.push(onSnapshot(q, snap => {
        setData(prev => ({ ...prev, [key]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }));
    }
    return () => subs.forEach(u => u());
  }, [isAdmin, CLASS_ID]);

  const handleDelete = async (col, id) => {
    if (!window.confirm(`Delete this ${col.slice(0, -1)}? This action is permanent.`)) return;
    await deleteDoc(doc(db, 'classes', CLASS_ID, col, id));
  };

  // ── One-time migration: patch all yearbook_messages with yearbook profile data ──
  const handleBackfillSenderNames = async () => {
    if (!window.confirm(
      'This will update ALL existing yearbook messages to use yearbook names & photos.\nContinue?'
    )) return;

    setBackfilling(true);
    setBackfillResult(null);

    try {
      // 1. Fetch all messages
      const msgSnap = await getDocs(collection(db, 'yearbook_messages'));
      const messages = msgSnap.docs.map(d => ({ ref: d.ref, ...d.data() }));

      // 2. Gather unique senderIds
      const senderIds = [...new Set(messages.map(m => m.senderId).filter(Boolean))];

      // 3. Fetch each sender's member profile
      const profileMap = {};
      await Promise.all(
        senderIds.map(async (uid) => {
          const snap = await getDoc(doc(db, 'classes', CLASS_ID, 'members', uid));
          if (snap.exists()) profileMap[uid] = snap.data();
        })
      );

      // 4. Build batched updates (Firestore allows max 500 per batch)
      let updated = 0;
      let skipped = 0;
      const BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const msg of messages) {
        const profile = profileMap[msg.senderId];
        if (!profile) { skipped++; continue; }

        const yearbookName = profile.name || msg.senderName;
        const yearbookPhoto =
          profile.profilePhotoImageKit ||
          profile.profilePhoto ||
          msg.senderPhotoURL;

        // Only write if something changed
        if (yearbookName === msg.senderName && yearbookPhoto === msg.senderPhotoURL) {
          skipped++;
          continue;
        }

        batch.update(msg.ref, {
          senderName: yearbookName,
          senderPhotoURL: yearbookPhoto,
        });
        updated++;
        batchCount++;

        // Commit and start a new batch if we hit the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      // Commit any remaining
      if (batchCount > 0) await batch.commit();

      setBackfillResult({ ok: true, updated, skipped, total: messages.length });
    } catch (err) {
      console.error('Backfill error:', err);
      setBackfillResult({ ok: false, error: err.message });
    } finally {
      setBackfilling(false);
    }
  };

  const currentData = data[tab];

  const formatTs = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  if (!isAdmin) return null;

  return (
    <div className="page-wrapper admin-page">
      <div className="page-header">
        <p className="section-label">Super User</p>
        <h1><HiOutlineLightningBolt className="admin-header-icon" /> Admin Panel</h1>
        <p>Manage members, gallery, wall notes, and events for CS 2026.</p>
      </div>

      {/* Stats row */}
      <div className="admin__stats">
        {TABS.map(t => (
          <div key={t.key} className="glass-card admin-stat">
            <span className="admin-stat__icon">{t.icon}</span>
            <span className="admin-stat__count">{data[t.key].length}</span>
            <span className="admin-stat__label">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin__tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin__tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="admin__content">
        {currentData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No {tab} yet</h3>
          </div>
        ) : (
          <div className="admin__list stagger-children">
            {tab === 'members' && currentData.map(m => (
              <div key={m.id} className="admin-row clay-card">
                <div className="admin-row__avatar">
                  {m.profilePhoto
                    ? <img src={m.profilePhoto} alt={m.name} className="avatar" style={{ width: 40, height: 40 }} />
                    : <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
                        {(m.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                  }
                </div>
                <div className="admin-row__info">
                  <p className="admin-row__title">{m.name || 'Unnamed'}</p>
                  <p className="admin-row__sub">{details[m.id]?.email || m.email || 'no email'} · Roll #{m.rollNumber || '—'}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm admin-row__del"
                  onClick={() => handleDelete('members', m.id)}
                  title="Delete member"
                >
                  <HiX />
                </button>
              </div>
            ))}

            {tab === 'gallery' && currentData.map(p => (
              <div key={p.id} className="admin-row clay-card">
                <img src={p.url} alt={p.caption} className="admin-row__thumb" />
                <div className="admin-row__info">
                  <p className="admin-row__title">{p.caption || '(No caption)'}</p>
                  <p className="admin-row__sub">{p.category} · By {p.uploadedBy} · {formatTs(p.createdAt)}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm admin-row__del"
                  onClick={() => handleDelete('gallery', p.id)}
                >
                  <HiX />
                </button>
              </div>
            ))}

            {tab === 'wall' && currentData.map(n => (
              <div key={n.id} className="admin-row clay-card">
                <div className="admin-row__note-color" style={{ background: n.color || '#FFE066' }}></div>
                <div className="admin-row__info">
                  <p className="admin-row__title">"{n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}"</p>
                  <p className="admin-row__sub">By {n.author} · {formatTs(n.createdAt)}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm admin-row__del"
                  onClick={() => handleDelete('wall', n.id)}
                >
                  <HiX />
                </button>
              </div>
            ))}

            {tab === 'events' && currentData.map(ev => (
              <div key={ev.id} className="admin-row clay-card">
                {ev.photoURL && (
                  <img src={ev.photoURL} alt={ev.title} className="admin-row__thumb" />
                )}
                <div className="admin-row__info">
                  <p className="admin-row__title">{ev.title}</p>
                  <p className="admin-row__sub">{ev.category} · By {ev.postedBy} · {formatTs(ev.createdAt)}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm admin-row__del"
                  onClick={() => handleDelete('events', ev.id)}
                >
                  <HiX />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Hide emails ── */}
      <div className="admin__migration glass-card">
        <div className="admin__migration-text">
          <span className="admin__migration-title">Hide email addresses</span>
          <span className="admin__migration-desc">
            Moves emails from the public profiles into the members-only records, so only logged-in classmates
            can see them. <strong>{publicEmails.length}</strong> profile{publicEmails.length === 1 ? '' : 's'} still
            show{publicEmails.length === 1 ? 's' : ''} an email publicly.
          </span>
        </div>
        <button
          className="btn btn-glass btn-sm"
          onClick={handleMoveEmails}
          disabled={movingEmails || publicEmails.length === 0}
          style={{ flexShrink: 0 }}
        >
          {movingEmails ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Moving…</>
          ) : 'Move emails'}
        </button>
        {moveEmailsResult && (
          <div className={`admin__migration-result ${moveEmailsResult.ok ? 'ok' : 'err'}`}>
            {moveEmailsResult.ok
              ? `Done — ${moveEmailsResult.moved} email${moveEmailsResult.moved === 1 ? '' : 's'} moved.`
              : `Error: ${moveEmailsResult.error}`
            }
          </div>
        )}
      </div>

      {/* ── Chat cleanup ── */}
      <div className="admin__migration glass-card">
        <div className="admin__migration-text">
          <span className="admin__migration-title">Chat cleanup</span>
          <span className="admin__migration-desc">
            Class chat keeps {CHAT_RETENTION_DAYS} days of messages. New messages are deleted automatically
            once the Firestore TTL policy is on; this removes older ones that were sent before that.
            {oldChatCount !== null && <> <strong>{oldChatCount}</strong> message{oldChatCount === 1 ? '' : 's'} older than {CHAT_RETENTION_DAYS} days right now.</>}
          </span>
        </div>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleDeleteOldChat}
          disabled={cleaningChat || !oldChatCount}
          style={{ flexShrink: 0 }}
        >
          {cleaningChat ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Deleting…</>
          ) : `Delete old messages`}
        </button>
        {chatCleanResult && (
          <div className={`admin__migration-result ${chatCleanResult.ok ? 'ok' : 'err'}`}>
            {chatCleanResult.ok
              ? `Done — deleted ${chatCleanResult.deleted} old message${chatCleanResult.deleted === 1 ? '' : 's'}.`
              : `Error: ${chatCleanResult.error}`
            }
          </div>
        )}
      </div>

      {/* ── Migration zone ── */}
      <div className="admin__migration glass-card">
        <div className="admin__migration-text">
          <span className="admin__migration-title">🔧 Fix Yearbook Message Senders</span>
          <span className="admin__migration-desc">
            Updates all existing messages to show the sender's yearbook name &amp; photo
            instead of their Google account info. Safe to run multiple times.
          </span>
        </div>
        <button
          className="btn btn-glass btn-sm"
          onClick={handleBackfillSenderNames}
          disabled={backfilling}
          style={{ flexShrink: 0 }}
        >
          {backfilling ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Running…</>
          ) : '▶ Run Fix'}
        </button>
        {backfillResult && (
          <div className={`admin__migration-result ${backfillResult.ok ? 'ok' : 'err'}`}>
            {backfillResult.ok
              ? `✅ Done — ${backfillResult.updated} updated, ${backfillResult.skipped} already correct (${backfillResult.total} total)`
              : `❌ Error: ${backfillResult.error}`
            }
          </div>
        )}
      </div>
    </div>
  );
}
