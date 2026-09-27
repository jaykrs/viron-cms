import Link from 'next/link';

export default function Hero({ eyebrow, title, subtitle, image, primaryCta, secondaryCta }) {
  return (
    <section className="border-b border-hairline">
      <div
        className={`max-w-content mx-auto px-6 py-20 md:py-28 ${
          image ? 'grid md:grid-cols-[1fr_420px] gap-12 items-center' : ''
        }`}
      >
        <div className={image ? '' : 'max-w-[720px]'}>
          {eyebrow && (
            <div className="flex items-center gap-2 text-signal font-medium text-sm mb-5">
              <span className="inline-block w-4 h-[2px] bg-signal" />
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] text-ink text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 text-lg text-slate leading-relaxed max-w-[600px]">{subtitle}</p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-10 flex flex-wrap items-center gap-6">
              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-signal hover:border-signal transition-colors"
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="text-sm font-medium text-ink border-b border-ink pb-0.5 hover:text-signal hover:border-signal transition-colors"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
        {image && (
          <div className="border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full h-full object-cover aspect-[4/5] md:aspect-auto" />
          </div>
        )}
      </div>
    </section>
  );
}
