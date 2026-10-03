import Link from 'next/link';

export default function ServicesGrid({ heading, items = [] }) {
  return (
    <section className="block-services-grid">
      <div className="block-services-grid__inner">
        {heading && <h2 className="block-services-grid__heading">{heading}</h2>}
        <div className="block-services-grid__list">
          {items.map((item) => (
            <Link key={item.title} href={item.href} className="group block-services-grid__item">
              {item.tag && <span className="block-services-grid__tag">{item.tag}</span>}
              <h3 className="block-services-grid__title">{item.title}</h3>
              <p className="block-services-grid__desc">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
