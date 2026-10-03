export default function Stats({ items = [] }) {
  return (
    <section className="block-stats">
      <div className="block-stats__grid">
        {items.map((stat) => (
          <div key={stat.label}>
            <div className="block-stats__value">{stat.value}</div>
            <div className="block-stats__label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
