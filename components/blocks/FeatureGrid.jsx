import Link from 'next/link';

export default function FeatureGrid({ heading, subheading, items = [] }) {
  return (
    <section className="block-feature-grid">
      <div className="block-feature-grid__inner">
        {(heading || subheading) && (
          <div className="block-feature-grid__header">
            {heading && <h2 className="block-feature-grid__heading">{heading}</h2>}
            {subheading && <p className="block-feature-grid__subheading">{subheading}</p>}
          </div>
        )}
        <div className="block-feature-grid__grid">
          {items.map((item) => {
            const content = (
              <div className="block-feature-grid__item">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="block-feature-grid__item-image" />
                )}
                <h3 className="block-feature-grid__item-title">{item.title}</h3>
                <p className="block-feature-grid__item-desc">{item.description}</p>
                {item.href && <span className="block-feature-grid__item-more">Learn more</span>}
              </div>
            );
            return item.href ? (
              <Link key={item.title} href={item.href} className="block-feature-grid__item-link">
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
