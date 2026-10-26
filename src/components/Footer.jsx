import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link to="/" className="site-footer__mark">CS’26</Link>
        <p className="site-footer__line">Computer Science · Batch 2022–2026</p>
        <p className="site-footer__note">Made by the class, for the class.</p>
      </div>
    </footer>
  );
}
