import Link from 'next/link';

export default function Hero({ eyebrow, title, subtitle, image, primaryCta, secondaryCta }) {
  return (
    <section className="block-hero">
      <div className={`block-hero__inner ${image ? 'block-hero__inner--with-image' : ''}`}>
        <div className={image ? '' : 'block-hero__content--full'}>
          {eyebrow && (
            <div className="block-hero__eyebrow">
              <span className="block-hero__eyebrow-dash" />
              {eyebrow}
            </div>
          )}
          <h1 className="block-hero__title">{title}</h1>
          {subtitle && <p className="block-hero__subtitle">{subtitle}</p>}
          {(primaryCta || secondaryCta) && (
            <div className="block-hero__ctas">
              {primaryCta && (
                <Link href={primaryCta.href} className="btn-primary">
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link href={secondaryCta.href} className="btn-link">
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
        {image && (
          <div className="block-hero__image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="block-hero__image" />
          </div>
        )}
      </div>
    </section>
  );
}
