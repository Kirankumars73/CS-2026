import './Signatures.css';

const getInitials = (name) =>
  (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

// Yearbook signatures (yearbook_messages) addressed to one member, written out in pen
export default function Signatures({ messages }) {
  return (
    <div className="signatures">
      {messages.map(msg => (
        <figure key={msg.id} className="signature">
          <blockquote className="hand signature__text">{msg.text}</blockquote>
          <figcaption className="signature__by">
            {msg.senderPhotoURL ? (
              <img src={msg.senderPhotoURL} alt="" className="signature__avatar" />
            ) : (
              <span className="signature__avatar signature__avatar--initials">{getInitials(msg.senderName)}</span>
            )}
            <span className="signature__name">{msg.senderName || 'A classmate'}</span>
            <span className="signature__date">{formatDate(msg.createdAt)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
