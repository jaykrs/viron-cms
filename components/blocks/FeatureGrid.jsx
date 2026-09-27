import Link from 'next/link';

export default function FeatureGrid({ heading, subheading, items = [] }) {
  return (
    <section className="border-b border-hairline">
      <div className="max-w-content mx-auto px-6 py-16">
        {(heading || subheading) && (
          <div className="max-w-[560px] mb-12">
            {heading && <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">{heading}</h2>}
            {subheading && <p className="mt-3 text-slate">{subheading}</p>}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-px bg-hairline border border-hairline">
          {items.map((item) => {
            const content = (
              <div className="bg-paper h-full p-8 border-l-2 border-transparent hover:border-signal transition-colors">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="w-10 h-10 object-cover mb-4" />
                )}
                <h3 className="font-display text-lg font-bold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm text-slate leading-relaxed">{item.description}</p>
                {item.href && (
                  <span className="mt-4 inline-block text-sm font-medium text-signal border-b border-signal/40">
                    Learn more
                  </span>
                )}
              </div>
            );
            return item.href ? (
              <Link key={item.title} href={item.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.title}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
