export default function Stats({ items = [] }) {
  return (
    <section className="border-b border-hairline">
      <div className="max-w-content mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((stat) => (
          <div key={stat.label}>
            <div className="font-display text-3xl md:text-4xl font-bold text-ink">{stat.value}</div>
            <div className="mt-1 text-sm text-slate">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
