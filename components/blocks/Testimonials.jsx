export default function Testimonials({ heading, items = [] }) {
  return (
    <section className="block-testimonials">
      <div className="block-testimonials__inner">
        {heading && <h2 className="block-testimonials__heading">{heading}</h2>}
        <div className="block-testimonials__grid">
          {items.map((t) => (
            <figure key={t.name} className="block-testimonials__item">
              <blockquote className="block-testimonials__quote">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="block-testimonials__footer">
                {t.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatar} alt="" className="block-testimonials__avatar" />
                )}
                <span>
                  <span className="block-testimonials__name">{t.name}</span> — {t.role}, {t.company}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
