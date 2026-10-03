import Link from 'next/link';

export default function CTA({ heading, subhead, backgroundImage, primaryCta }) {
  return (
    <section className="block-cta">
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backgroundImage} alt="" className="block-cta__bg" />
      )}
      <div className="block-cta__inner">
        <div className="block-cta__content">
          <h2 className="block-cta__heading">{heading}</h2>
          {subhead && <p className="block-cta__subhead">{subhead}</p>}
        </div>
        {primaryCta && (
          <Link href={primaryCta.href} className="btn-primary--inverted">
            {primaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
