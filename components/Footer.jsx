import Link from 'next/link';

export default function Footer({ data }) {
  if (!data) return null;
  const { columns = [], copyright, social = [] } = data.props || {};

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__brand-name">Vireon Labs</div>
          <p className="site-footer__brand-tagline">
            Full stack development, AI consulting, and cloud automation for growing businesses.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <div className="site-footer__col-heading">{col.heading}</div>
            <ul className="site-footer__list">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="site-footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {social.length > 0 && (
          <div>
            <div className="site-footer__col-heading">Follow</div>
            <ul className="site-footer__list">
              {social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="site-footer__link">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="site-footer__bottom">
        <div className="site-footer__copyright">{copyright}</div>
      </div>
    </footer>
  );
}
