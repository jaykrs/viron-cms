export default function RichText({ heading, paragraphs = [] }) {
  return (
    <section className="border-b border-hairline">
      <div className="max-w-content mx-auto px-6 py-16 grid md:grid-cols-[280px_1fr] gap-10">
        {heading && (
          <h2 className="font-display text-2xl font-bold text-ink md:sticky md:top-24 self-start">{heading}</h2>
        )}
        <div className="max-w-[640px] space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-slate leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
