export default function Testimonials({ heading, items = [] }) {
  return (
    <section className="border-b border-hairline">
      <div className="max-w-content mx-auto px-6 py-16">
        {heading && <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-10">{heading}</h2>}
        <div className="grid md:grid-cols-3 gap-10">
          {items.map((t) => (
            <figure key={t.name} className="border-l-2 border-hairline pl-5">
              <blockquote className="text-ink leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 text-sm text-slate">
                {t.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                )}
                <span>
                  <span className="font-medium text-ink">{t.name}</span> — {t.role}, {t.company}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
