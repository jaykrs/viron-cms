import Link from 'next/link';

export default function CTA({ heading, subhead, backgroundImage, primaryCta }) {
  return (
    <section className="relative bg-ink overflow-hidden">
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
      )}
      <div className="relative max-w-content mx-auto px-6 py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="max-w-[520px]">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-paper">{heading}</h2>
          {subhead && <p className="mt-3 text-paper/70">{subhead}</p>}
        </div>
        {primaryCta && (
          <Link
            href={primaryCta.href}
            className="inline-flex items-center border border-paper bg-paper px-5 py-3 text-sm font-medium text-ink hover:bg-signal hover:border-signal hover:text-paper transition-colors shrink-0 w-fit"
          >
            {primaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
