import { HiArrowRight } from 'react-icons/hi';

/**
 * Editorial event spread — photo and story side by side, alternating sides down the page.
 */
export default function EventCard({ event, index = 0, onGalleryClick }) {
  const flip = index % 2 !== 0;
  const title = event.title || 'Untitled event';

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const meta = [event.category, dateStr].filter(Boolean).join(' · ');

  const coverURL = event.photoURLImageKit || event.photoURL;
  const gallery = event.additionalPhotoURLsImageKit || event.additionalPhotoURLs || [];

  return (
    <article className={`event-card ${flip ? 'event-card--flip' : ''}`}>
      <div className="event-card__photo">
        {coverURL ? (
          <img src={coverURL} alt={title} loading="lazy" />
        ) : (
          <span className="event-card__photo-empty">{event.category || 'Event'}</span>
        )}
      </div>

      <div className="event-card__body">
        {meta && <p className="event-card__meta">{meta}</p>}
        <h2 className="event-card__title">{title}</h2>
        {event.description && <p className="event-card__desc">{event.description}</p>}
        <div className="event-card__foot">
          {event.postedBy && <span className="event-card__by">Posted by {event.postedBy}</span>}
          {gallery.length > 0 && (
            <button className="btn btn-glass btn-sm" onClick={() => onGalleryClick(event)}>
              View {gallery.length} photos <HiArrowRight />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
