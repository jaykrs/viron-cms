import Link from 'next/link';

export default function Footer({ data }) {
  if (!data) return null;
  const { columns = [], copyright, social = [] } = data.props || {};

  return (
    <footer className="bg-ink text-paper/90 mt-24">
      <div className="max-w-content mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display text-lg font-bold text-paper">Vireon Labs</div>
          <p className="mt-3 text-sm text-paper/60 max-w-[220px]">
            Full stack development, AI consulting, and cloud automation for growing businesses.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <div className="text-sm font-medium text-paper/50 mb-3">{col.heading}</div>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-paper/80 hover:text-signal transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {social.length > 0 && (
          <div>
            <div className="text-sm font-medium text-paper/50 mb-3">Follow</div>
            <ul className="space-y-2">
              {social.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-paper/80 hover:text-signal transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-paper/10">
        <div className="max-w-content mx-auto px-6 py-6 text-xs text-paper/50">{copyright}</div>
      </div>
    </footer>
  );
}
