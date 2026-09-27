import Link from 'next/link';

export default function ServicesGrid({ heading, items = [] }) {
  return (
    <section className="border-b border-hairline">
      <div className="max-w-content mx-auto px-6 py-16">
        {heading && <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-10">{heading}</h2>}
        <div className="divide-y divide-hairline border-t border-b border-hairline">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-10 py-8 hover:bg-ink/[0.02] transition-colors px-2"
            >
              {item.tag && (
                <span className="font-mono text-xs text-amber shrink-0 md:w-32">{item.tag}</span>
              )}
              <h3 className="font-display text-xl font-bold text-ink shrink-0 md:w-72 group-hover:text-signal transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
