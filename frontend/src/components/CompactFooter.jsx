import { useCallback } from 'react';
import '../styles/CompactFooter.css';

export default function CompactFooter() {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <footer className="compact-footer">
      <span className="compact-footer__text">
        &copy; {new Date().getFullYear()} Dept of IST, Anna University
        {' · '}
        <a href="mailto:istdept@auist.net" className="compact-footer__link">
          istdept@auist.net
        </a>
      </span>
      <button
        className="compact-footer__scroll-top"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Back to top"
      >
        ↑
      </button>
    </footer>
  );
}
