import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Editorial-style event card — photo and info sit cleanly side-by-side,
 * alternating alignment on each card.
 */
export default function EventCard({ event, index = 0, onGalleryClick }) {
  const isRight = index % 2 !== 0; // even → image left, odd → image right

  const title = event.title || 'Untitled Event';
  const titleWords = title.split(' ');
  const half = Math.ceil(titleWords.length / 2);
  const line1 = titleWords.slice(0, half).join(' ');
  const line2 = titleWords.slice(half).join(' ');

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const meta = [event.category, dateStr].filter(Boolean).join('  •  ');

  const coverURL =
    event.photoURL ||
    'https://images.unsplash.com/photo-1526510747491-58f928ec870f?fm=jpg&q=60';

  const hasGallery =
    Array.isArray(event.additionalPhotoURLs) &&
    event.additionalPhotoURLs.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="w-full my-16"
    >
      {/* Meta label */}
      <p
        className={`mb-4 text-xs font-semibold tracking-[0.28em] uppercase text-zinc-500 ${
          isRight ? 'text-right' : 'text-left'
        }`}
      >
        {meta}
      </p>

      {/* Card row */}
      <div
        className={`flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden border border-white/8 shadow-2xl ${
          isRight ? 'md:flex-row-reverse' : ''
        }`}
        style={{ background: 'rgba(14,14,22,0.85)' }}
      >
        {/* ── Photo panel ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative md:w-[42%] h-72 md:h-auto shrink-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
          <img
            src={coverURL}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
        </motion.div>

        {/* ── Divider line ── */}
        <div className="hidden md:block w-px bg-white/8 shrink-0" />

        {/* ── Info panel ── */}
        <motion.div
          initial={{ opacity: 0, x: isRight ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={`flex flex-col justify-between gap-8 p-8 md:p-10 flex-1 ${
            isRight ? 'items-end text-right' : 'items-start text-left'
          }`}
        >
          {/* Title */}
          <div>
            <h2 className="text-4xl md:text-5xl font-extralight leading-[1.1] tracking-tight text-white">
              {line1}
              {line2 && (
                <>
                  <br />
                  <span className="font-normal text-zinc-300">{line2}</span>
                </>
              )}
            </h2>
          </div>

          {/* Description + CTA row */}
          <div
            className={`flex items-center gap-6 w-full ${
              isRight ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Circular arrow CTA */}
            <motion.button
              onClick={() => hasGallery && onGalleryClick(event)}
              whileHover={hasGallery ? { scale: 1.1 } : {}}
              whileTap={hasGallery ? { scale: 0.95 } : {}}
              title={
                hasGallery
                  ? `View ${event.additionalPhotoURLs.length} more photos`
                  : 'No additional photos'
              }
              className={`
                flex h-16 w-16 shrink-0 items-center justify-center
                rounded-full border transition-all duration-300
                ${
                  hasGallery
                    ? 'border-zinc-500 hover:border-white hover:bg-white/10 cursor-pointer'
                    : 'border-zinc-800 opacity-40 cursor-not-allowed'
                }
              `}
            >
              <ArrowRight
                size={20}
                className={`text-zinc-300 transition-transform duration-300 ${
                  hasGallery ? 'group-hover:text-white hover:-rotate-45' : ''
                } ${isRight ? 'rotate-180' : ''}`}
              />
            </motion.button>

            {/* Description text */}
            <p className="flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-4">
              {event.description || 'Captured memories from this special occasion.'}
            </p>
          </div>

          {/* Posted by */}
          {event.postedBy && (
            <p className="text-xs text-zinc-600 tracking-wide">
              Posted by <span className="text-zinc-400 font-medium">{event.postedBy}</span>
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
