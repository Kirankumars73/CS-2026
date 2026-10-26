import { Link } from 'react-router-dom';
import { HiOutlineCake, HiArrowRight } from 'react-icons/hi';
import { formatBirthday } from '../utils/details';
import { portraitUrl } from '../utils/imageUtils';
import './Birthdays.css';

const photoOf = (m) => m.profilePhotoImageKit || m.profilePhoto || '';

// Today's birthdays (with a nudge to sign their yearbook) and the next few coming up
export default function Birthdays({ today, upcoming }) {
  return (
    <div className="birthdays">
      {today.map(p => {
        const first = (p.name || 'them').split(' ')[0];
        return (
          <Link key={p.id} to={`/profile/${p.id}`} className="birthday-today">
            {photoOf(p) && <img src={portraitUrl(photoOf(p))} alt="" className="birthday-today__photo" />}
            <div className="birthday-today__text">
              <span className="birthday-today__kicker"><HiOutlineCake /> Birthday today</span>
              <span className="birthday-today__name">Happy birthday, {first}!</span>
              <span className="birthday-today__cta">Sign {first}’s yearbook <HiArrowRight /></span>
            </div>
          </Link>
        );
      })}

      {upcoming.length > 0 && (
        <ul className="birthday-list">
          {upcoming.map(p => (
            <li key={p.id}>
              <Link to={`/profile/${p.id}`} className="birthday-list__item">
                <span className="birthday-list__date">{formatBirthday(p.birthday)}</span>
                <span className="birthday-list__name">{p.name}</span>
                <span className="birthday-list__in">{p.days === 1 ? 'tomorrow' : `in ${p.days} days`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
